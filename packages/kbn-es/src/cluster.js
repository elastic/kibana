/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const fs = require('fs');
const util = require('util');
const execa = require('execa');
const chalk = require('chalk');
const path = require('path');
const Rx = require('rxjs');
const { mergeMap, mergeAll, defaultIfEmpty, share } = require('rxjs/operators');
const { setTimeout } = require('timers/promises');
const { firstValueFrom } = require('@kbn/std');
const { Client } = require('@elastic/elasticsearch');

const { downloadSnapshot, installSnapshot, installSource, installArchive } = require('./install');
const { ES_BIN } = require('./paths');
const { log: defaultLog, parseEsLog, extractConfigFiles, NativeRealm } = require('./utils');
const { createCliError } = require('./errors');
const { promisify } = require('util');
const treeKillAsync = promisify(require('tree-kill'));
const { parseSettings, SettingsFilter } = require('./settings');
const {
  CA_CERT_PATH,
  ES_P12_PATH,
  ES_P12_PASSWORD,
  extract,
  observeChunks,
  chunksToLines,
} = require('@kbn/dev-utils');
const readFile = util.promisify(fs.readFile);

const PROMISE_NEVER = new Promise(() => {});

/**
 * listen to data on stream until a chunk matches the test regular expression
 * @param {Rx.Observable<Buffer>} chunk$
 * @param {RegExp} test
 * @returns {Promise<RegExpMatchArray>}
 */
const first = async (chunk$, test) => {
  const value = await firstValueFrom(
    chunk$.pipe(
      mergeMap((chunk) => {
        const match = chunk.toString().match(test);
        return match ? [match] : [];
      }),
      defaultIfEmpty()
    )
  );

  // in order to maintain the previous logic and prevent unhandled rejections we return
  // a promise that never resolves when a match isn't found. this isn't great but until
  // we can rewrite this to use TS + observables our only other options are returning
  // undefined and handling that everywhere, so I went this route as a temporary hack
  return value ?? (await PROMISE_NEVER);
};

exports.Cluster = class Cluster {
  constructor({ log = defaultLog, ssl = false } = {}) {
    this._log = log.withType('@kbn/es Cluster');
    this._ssl = ssl;
    this._caCertPromise = ssl ? readFile(CA_CERT_PATH) : undefined;
    this._subscription = new Rx.Subscription();
  }

  /**
   * Builds and installs ES from source
   *
   * @param {Object} options
   * @property {Array} options.installPath
   * @property {Array} options.sourcePath
   * @returns {Promise<{installPath}>}
   */
  async installSource(options = {}) {
    this._log.info(chalk.bold('Installing from source'));
    this._log.indent(4);

    const { installPath } = await installSource({ log: this._log, ...options });

    this._log.indent(-4);

    return { installPath };
  }

  /**
   * Download ES from a snapshot
   *
   * @param {Object} options
   * @property {Array} options.installPath
   * @property {Array} options.sourcePath
   * @returns {Promise<{installPath}>}
   */
  async downloadSnapshot(options = {}) {
    this._log.info(chalk.bold('Downloading snapshot'));
    this._log.indent(4);

    const { installPath } = await downloadSnapshot({
      log: this._log,
      ...options,
    });

    this._log.indent(-4);

    return { installPath };
  }

  /**
   * Download and installs ES from a snapshot
   *
   * @param {Object} options
   * @property {Array} options.installPath
   * @property {Array} options.sourcePath
   * @returns {Promise<{installPath}>}
   */
  async installSnapshot(options = {}) {
    this._log.info(chalk.bold('Installing from snapshot'));
    this._log.indent(4);

    const { installPath } = await installSnapshot({
      log: this._log,
      ...options,
    });

    this._log.indent(-4);

    return { installPath };
  }

  /**
   * Installs ES from a local tar
   *
   * @param {String} path
   * @param {Object} options
   * @property {Array} options.installPath
   * @returns {Promise<{installPath}>}
   */
  async installArchive(path, options = {}) {
    this._log.info(chalk.bold('Installing from an archive'));
    this._log.indent(4);

    const { installPath } = await installArchive(path, {
      log: this._log,
      ...options,
    });

    this._log.indent(-4);

    return { installPath };
  }

  /**
   * Unpacks a tar or zip file containing the data directory for an
   * ES cluster.
   *
   * @param {String} installPath
   * @param {String} archivePath
   * @param {String} [extractDirName]
   */
  async extractDataDirectory(installPath, archivePath, extractDirName = 'data') {
    this._log.info(chalk.bold(`Extracting data directory`));
    this._log.indent(4);

    // stripComponents=1 excludes the root directory as that is how our archives are
    // structured. This works in our favor as we can explicitly extract into the data dir
    const extractPath = path.resolve(installPath, extractDirName);
    this._log.info(`Data archive: ${archivePath}`);
    this._log.info(`Extract path: ${extractPath}`);

    await extract({
      archivePath,
      targetDir: extractPath,
      stripComponents: 1,
    });

    this._log.indent(-4);
  }

  /**
   * Starts ES and returns resolved promise once started
   *
   * @param {String} installPath
   * @param {Object} options
   * @property {Array} options.esArgs
   * @property {String} options.password - super user password used to bootstrap
   * @returns {Promise}
   */
  async start(installPath, options = {}) {
    this._exec(installPath, options);

    await Promise.race([
      // wait for native realm to be setup and es to be started
      Promise.all([
        first(this._stdout$, /started/),
        this._nativeRealmSetup,
        this._licenseInitialized,
      ]),

      // await the outcome of the process in case it exits before starting
      (async () => {
        await this._outcome;
        throw createCliError('ES exited without starting');
      })(),
    ]);
  }

  /**
   * Starts Elasticsearch and waits for Elasticsearch to exit
   *
   * @param {String} installPath
   * @param {Object} options
   * @property {Array} options.esArgs
   * @returns {Promise<void>}
   */
  async run(installPath, options = {}) {
    this._exec(installPath, options);

    // log native realm setup errors so they aren't uncaught
    (async () => {
      try {
        await this._nativeRealmSetup;
      } catch (error) {
        this._log.error(error);
        this.stop();
      }
    })();

    // await the final outcome of the process
    await this._outcome;
  }

  /**
   * Stops ES process, if it's running
   *
   * @returns {Promise}
   */
  async stop() {
    if (this._stopCalled) {
      return;
    }
    this._stopCalled = true;

    if (!this._process || !this._outcome) {
      throw new Error('ES has not been started');
    }

    await treeKillAsync(this._process.pid);

    await this._outcome;

    this._subscription.unsubscribe();
  }

  /**
   * Common logic from this.start() and this.run()
   *
   * Start the elasticsearch process (stored at `this._process`)
   * and "pipe" its stdio to `this._log`. Also create `this._outcome`
   * which will be resolved/rejected when the process exits.
   *
   * @private
   * @param {String} installPath
   * @param {{
   *  esArgs?: string|string[],
   *  esJavaOpts?: string|string[],
   *  esJavaOptions?: string,
   *  skipNativeRealmSetup?: boolean
   *  reportTime?: (...args: any[]) => void
   *  startTime?: number
   *  password?: string
   * }} opts
   * @return {void}
   */
  _exec(installPath, opts = {}) {
    const { skipNativeRealmSetup = false, reportTime = () => {}, startTime, ...options } = opts;

    if (this._process || this._outcome) {
      throw new Error('ES has already been started');
    }

    this._log.info(chalk.bold('Starting'));
    this._log.indent(4);

    const esArgs = [
      'action.destructive_requires_name=true',
      'ingest.geoip.downloader.enabled=false',
    ].concat(options.esArgs || []);

    // Add to esArgs if ssl is enabled
    if (this._ssl) {
      esArgs.push('xpack.security.http.ssl.enabled=true');

      // Include default keystore settings only if keystore isn't configured.
      if (!esArgs.some((arg) => arg.startsWith('xpack.security.http.ssl.keystore'))) {
        esArgs.push(`xpack.security.http.ssl.keystore.path=${ES_P12_PATH}`);
        esArgs.push(`xpack.security.http.ssl.keystore.type=PKCS12`);
        esArgs.push(`xpack.security.http.ssl.keystore.password=${ES_P12_PASSWORD}`);
      }
    }

    const args = parseSettings(extractConfigFiles(esArgs, installPath, { log: this._log }), {
      filter: SettingsFilter.NonSecureOnly,
    }).reduce(
      (acc, [settingName, settingValue]) => acc.concat(['-E', `${settingName}=${settingValue}`]),
      []
    );

    this._log.debug('%s %s', ES_BIN, args.join(' '));

    let esJavaOpts = `${options.esJavaOpts || ''} ${process.env.ES_JAVA_OPTS || ''}`;

    // ES now automatically sets heap size to 50% of the machine's available memory
    // so we need to set it to a smaller size for local dev and CI
    // especially because we currently run many instances of ES on the same machine during CI
    // inital and max must be the same, so we only need to check the max
    if (!esJavaOpts.includes('Xmx')) {
      // 1536m === 1.5g
      esJavaOpts += ' -Xms1536m -Xmx1536m';
    }

    this._log.debug('ES_JAVA_OPTS: %s', esJavaOpts.trim());

    this._process = execa(ES_BIN, args, {
      cwd: installPath,
      env: {
        ...(installPath ? { ES_TMPDIR: path.resolve(installPath, 'ES_TMPDIR') } : {}),
        ...process.env,
        JAVA_HOME: '', // By default, we want to always unset JAVA_HOME so that the bundled JDK will be used
        ES_JAVA_OPTS: esJavaOpts.trim(),
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    this._stdout$ = observeChunks(this._process.stdout).pipe(share());
    this._stderr$ = observeChunks(this._process.stderr).pipe(share());

    // parse log output to find http port
    const httpPort = (async () => {
      const match = await first(this._stdout$, /HttpServer.+publish_address {[0-9.]+:([0-9]+)/);

      return match[1];
    })();

    this._licenseInitialized = first(this._stdout$, /license \[[^\]]+\] mode \[([^\]]+)\] - valid/);

    this._client = (async () => {
      const port = await httpPort;
      const auth = { username: 'elastic', password: options.password };
      return new Client(
        this._ssl
          ? {
              node: `https://localhost:${port}`,
              tls: { ca: await this._caCertPromise, rejectUnauthorized: true },
              auth,
            }
          : { node: `http://localhost:${port}`, auth }
      );
    })();

    this._clusterNotRed = (async () => {
      const status = await firstValueFrom(
        Rx.merge(
          Rx.defer(async () => {
            try {
              const [, license] = await this._licenseInitialized;
              const client = await this._client;

              let attempt = 0;
              while (true) {
                attempt += 1;
                try {
                  const health = await client.cluster.health();
                  if (health.status !== 'red') {
                    return [health.status];
                  }

                  if (attempt >= 10) {
                    throw new Error(
                      `Tried to get cluster health via the API ${attempt} times without it going green: ${JSON.stringify(
                        health
                      )}`
                    );
                  }

                  this._log.info(
                    `Cluster health is "red", waiting ${attempt} seconds and checking again.`
                  );

                  await setTimeout(attempt * 1000);
                } catch (error) {
                  if (error.message.includes('current license is non-compliant')) {
                    this._log.warning(
                      `[${license}] license is invalid so relying on logs for cluster health`
                    );
                    return [];
                  }
                }
              }
            } catch (error) {
              return [];
            }
          }).pipe(mergeAll()),

          // when running ES with an expired license it seems the cluster health is written to the log, but isn't when
          // the license is valid... So we subscribe in case the other check fails
          this._stdout$.pipe(
            chunksToLines(),
            mergeMap((line) => {
              const match = line.match(/current.health="([^"]+)"/);
              if (match) {
                const status = match[1].toLowerCase();
                if (status === 'yellow' || status === 'green') {
                  return [status];
                }
              }

              return [];
            })
          )
        )
      );

      this._log.info(`Cluster health is ${status}`);
    })();

    // once the http port is available setup the native realm
    this._nativeRealmSetup = (async () => {
      if (skipNativeRealmSetup) {
        return;
      }

      await this._licenseInitialized;
      await this._clusterNotRed;

      const nativeRealm = new NativeRealm({
        client: await this._client,
        log: this._log,
        elasticPassword: options.password,
      });

      await nativeRealm.setPasswords(options);
    })();

    let reportSent = false;
    // parse and forward es stdout to the log
    this._subscription.add(
      this._stdout$.subscribe({
        next: (chunk) => {
          for (const line of parseEsLog(chunk.toString('utf8'))) {
            if (!reportSent && line.message.includes('publish_address')) {
              reportSent = true;
              reportTime(startTime, 'ready', {
                success: true,
              });
            }
            this._log.info(line.formattedMessage);
          }
        },
        error: (error) => {
          this._log.error('error handling stdout of ES process:');
          this._log.error(error);
        },
      })
    );

    // forward es stderr to the log
    this._subscription.add(
      this._stderr$.subscribe({
        next: (chunk) => {
          this._log.error(chalk.red(chunk));
        },
        error: (error) => {
          this._log.error('error handling stderr of ES process:');
          this._log.error(error);
        },
      })
    );

    // observe the exit code of the process and reflect in _outcome promies
    this._outcome = (async () => {
      const code = await new Promise((resolve) => this._process.once('exit', resolve));

      if (this._stopCalled) {
        return;
      }

      // JVM exits with 143 on SIGTERM and 130 on SIGINT, dont' treat them as errors
      if (code > 0 && !(code === 143 || code === 130)) {
        reportTime(startTime, 'abort', {
          success: true,
          error: code,
        });
        throw createCliError(`ES exited with code ${code}`);
      } else {
        reportTime(startTime, 'error', {
          success: false,
          error: `exited with ${code}`,
        });
      }
    })();
  }
};
