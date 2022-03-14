/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const fsp = require('fs/promises');
const execa = require('execa');
const chalk = require('chalk');
const path = require('path');
const { Client } = require('@elastic/elasticsearch');
const { downloadSnapshot, installSnapshot, installSource, installArchive } = require('./install');
const { ES_BIN, ES_PLUGIN_BIN, ES_KEYSTORE_BIN } = require('./paths');
const {
  log: defaultLog,
  parseEsLog,
  extractConfigFiles,
  NativeRealm,
  parseTimeoutToMs,
} = require('./utils');
const { createCliError } = require('./errors');
const { promisify } = require('util');
const treeKillAsync = promisify(require('tree-kill'));
const { parseSettings, SettingsFilter } = require('./settings');
const { CA_CERT_PATH, ES_NOPASSWORD_P12_PATH, extract } = require('@kbn/dev-utils');

const DEFAULT_READY_TIMEOUT = parseTimeoutToMs('1m');

/** @typedef {import('./cluster_exec_options').EsClusterExecOptions} ExecOptions */

// listen to data on stream until map returns anything but undefined
const first = (stream, map) =>
  new Promise((resolve) => {
    const onData = (data) => {
      const result = map(data);
      if (result !== undefined) {
        resolve(result);
        stream.removeListener('data', onData);
      }
    };
    stream.on('data', onData);
  });

exports.Cluster = class Cluster {
  constructor({ log = defaultLog, ssl = false } = {}) {
    this._log = log.withType('@kbn/es Cluster');
    this._ssl = ssl;
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
    return await this._log.indent(4, async () => {
      const { installPath } = await installSource({ log: this._log, ...options });
      return { installPath };
    });
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
    return await this._log.indent(4, async () => {
      const { installPath } = await downloadSnapshot({
        log: this._log,
        ...options,
      });

      return { installPath };
    });
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
    return await this._log.indent(4, async () => {
      const { installPath } = await installSnapshot({
        log: this._log,
        ...options,
      });

      return { installPath };
    });
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
    return await this._log.indent(4, async () => {
      const { installPath } = await installArchive(path, {
        log: this._log,
        ...options,
      });

      return { installPath };
    });
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
    await this._log.indent(4, async () => {
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
    });
  }

  /**
   * Starts ES and returns resolved promise once started
   *
   * @param {String} installPath
   * @param {String} plugins - comma separated list of plugins to install
   * @param {Object} options
   * @returns {Promise}
   */
  async installPlugins(installPath, plugins, options) {
    const esJavaOpts = this.javaOptions(options);
    for (const plugin of plugins.split(',')) {
      await execa(ES_PLUGIN_BIN, ['install', plugin.trim()], {
        cwd: installPath,
        env: {
          JAVA_HOME: '', // By default, we want to always unset JAVA_HOME so that the bundled JDK will be used
          ES_JAVA_OPTS: esJavaOpts.trim(),
        },
      });
    }
  }

  async configureKeystoreWithSecureSettingsFiles(installPath, secureSettingsFiles) {
    const env = { JAVA_HOME: '' };
    for (const [secureSettingName, secureSettingFile] of secureSettingsFiles) {
      this._log.info(
        `setting secure setting %s to %s`,
        chalk.bold(secureSettingName),
        chalk.bold(secureSettingFile)
      );
      await execa(ES_KEYSTORE_BIN, ['add-file', secureSettingName, secureSettingFile], {
        cwd: installPath,
        env,
      });
    }
  }

  /**
   * Starts ES and returns resolved promise once started
   *
   * @param {String} installPath
   * @param {ExecOptions} options
   * @returns {Promise<void>}
   */
  async start(installPath, options = {}) {
    // _exec indents and we wait for our own end condition, so reset the indent level to it's current state after we're done waiting
    await this._log.indent(0, async () => {
      this._exec(installPath, options);

      await Promise.race([
        // wait for native realm to be setup and es to be started
        Promise.all([
          first(this._process.stdout, (data) => {
            if (/started/.test(data)) {
              return true;
            }
          }),
          this._setupPromise,
        ]),

        // await the outcome of the process in case it exits before starting
        this._outcome.then(() => {
          throw createCliError('ES exited without starting');
        }),
      ]);
    });
  }

  /**
   * Starts Elasticsearch and waits for Elasticsearch to exit
   *
   * @param {String} installPath
   * @param {ExecOptions} options
   * @returns {Promise<void>}
   */
  async run(installPath, options = {}) {
    // _exec indents and we wait for our own end condition, so reset the indent level to it's current state after we're done waiting
    await this._log.indent(0, async () => {
      this._exec(installPath, options);

      // log native realm setup errors so they aren't uncaught
      this._setupPromise.catch((error) => {
        this._log.error(error);
        this.stop();
      });

      // await the final outcome of the process
      await this._outcome;
    });
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
   * @param {ExecOptions} opts
   */
  _exec(installPath, opts = {}) {
    const {
      skipNativeRealmSetup = false,
      reportTime = () => {},
      startTime,
      skipReadyCheck,
      readyTimeout,
      ...options
    } = opts;

    if (this._process || this._outcome) {
      throw new Error('ES has already been started');
    }

    this._log.info(chalk.bold('Starting'));
    this._log.indent(4);

    const esArgs = [
      'action.destructive_requires_name=true',
      'ingest.geoip.downloader.enabled=false',
      'search.check_ccs_compatibility=true',
      'cluster.routing.allocation.disk.threshold_enabled=false',
    ].concat(options.esArgs || []);

    // Add to esArgs if ssl is enabled
    if (this._ssl) {
      esArgs.push('xpack.security.http.ssl.enabled=true');

      // Include default keystore settings only if keystore isn't configured.
      if (!esArgs.some((arg) => arg.startsWith('xpack.security.http.ssl.keystore'))) {
        esArgs.push(`xpack.security.http.ssl.keystore.path=${ES_NOPASSWORD_P12_PATH}`);
        esArgs.push(`xpack.security.http.ssl.keystore.type=PKCS12`);
        // We are explicitly using ES_NOPASSWORD_P12_PATH instead of ES_P12_PATH + ES_P12_PASSWORD. The reasoning for this is that setting
        // the keystore password using environment variables causes Elasticsearch to emit deprecation warnings.
      }
    }

    const args = parseSettings(extractConfigFiles(esArgs, installPath, { log: this._log }), {
      filter: SettingsFilter.NonSecureOnly,
    }).reduce(
      (acc, [settingName, settingValue]) => acc.concat(['-E', `${settingName}=${settingValue}`]),
      []
    );

    this._log.info('%s %s', ES_BIN, args.join(' '));
    const esJavaOpts = this.javaOptions(options);

    this._log.info('ES_JAVA_OPTS: %s', esJavaOpts);

    this._process = execa(ES_BIN, args, {
      cwd: installPath,
      env: {
        ...(installPath ? { ES_TMPDIR: path.resolve(installPath, 'ES_TMPDIR') } : {}),
        ...process.env,
        JAVA_HOME: '', // By default, we want to always unset JAVA_HOME so that the bundled JDK will be used
        ES_JAVA_OPTS: esJavaOpts,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    this._setupPromise = Promise.all([
      // parse log output to find http port
      first(this._process.stdout, (data) => {
        const match = data.toString('utf8').match(/HttpServer.+publish_address {[0-9.]+:([0-9]+)/);

        if (match) {
          return match[1];
        }
      }),

      // load the CA cert from disk if necessary
      this._ssl ? fsp.readFile(CA_CERT_PATH) : null,
    ]).then(async ([port, caCert]) => {
      const client = new Client({
        node: `${caCert ? 'https:' : 'http:'}//localhost:${port}`,
        auth: {
          username: 'elastic',
          password: options.password,
        },
        tls: caCert
          ? {
              ca: caCert,
              rejectUnauthorized: true,
            }
          : undefined,
      });

      if (!skipReadyCheck) {
        await this._waitForClusterReady(client, readyTimeout);
      }

      // once the cluster is ready setup the native realm
      if (!skipNativeRealmSetup) {
        const nativeRealm = new NativeRealm({
          log: this._log,
          elasticPassword: options.password,
          client,
        });

        await nativeRealm.setPasswords(options);
      }

      this._log.success('kbn/es setup complete');
    });

    let reportSent = false;
    // parse and forward es stdout to the log
    this._process.stdout.on('data', (data) => {
      const lines = parseEsLog(data.toString());
      lines.forEach((line) => {
        if (!reportSent && line.message.includes('publish_address')) {
          reportSent = true;
          reportTime(startTime, 'ready', {
            success: true,
          });
        }
        this._log.info(line.formattedMessage);
      });
    });

    // forward es stderr to the log
    this._process.stderr.on('data', (data) => this._log.error(chalk.red(data.toString())));

    // observe the exit code of the process and reflect in _outcome promies
    const exitCode = new Promise((resolve) => this._process.once('exit', resolve));
    this._outcome = exitCode.then((code) => {
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
    });
  }

  async _waitForClusterReady(client, readyTimeout = DEFAULT_READY_TIMEOUT) {
    let attempt = 0;
    const start = Date.now();

    this._log.info('waiting for ES cluster to report a yellow or green status');

    while (true) {
      attempt += 1;

      try {
        const resp = await client.cluster.health();
        if (resp.status !== 'red') {
          return;
        }

        throw new Error(`not ready, cluster health is ${resp.status}`);
      } catch (error) {
        const timeSinceStart = Date.now() - start;
        if (timeSinceStart > readyTimeout) {
          const sec = readyTimeout / 1000;
          throw new Error(`ES cluster failed to come online with the ${sec} second timeout`);
        }

        if (error.message.startsWith('not ready,')) {
          if (timeSinceStart > 10_000) {
            this._log.warning(error.message);
          }
        } else {
          this._log.warning(
            `waiting for ES cluster to come online, attempt ${attempt} failed with: ${error.message}`
          );
        }

        const waitSec = attempt * 1.5;
        await new Promise((resolve) => setTimeout(resolve, waitSec * 1000));
      }
    }
  }

  javaOptions(options) {
    let esJavaOpts = `${options.esJavaOpts || ''} ${process.env.ES_JAVA_OPTS || ''}`;

    // ES now automatically sets heap size to 50% of the machine's available memory
    // so we need to set it to a smaller size for local dev and CI
    // especially because we currently run many instances of ES on the same machine during CI
    // inital and max must be the same, so we only need to check the max
    if (!esJavaOpts.includes('Xmx')) {
      // 1536m === 1.5g
      esJavaOpts += ' -Xms1536m -Xmx1536m';
    }
    return esJavaOpts.trim();
  }
};
