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
const { downloadSnapshot, installSnapshot, installSource, installArchive } = require('./install');
const { ES_BIN } = require('./paths');
const {
  log: defaultLog,
  parseEsLog,
  extractConfigFiles,
  decompress,
  NativeRealm,
} = require('./utils');
const { createCliError } = require('./errors');
const { promisify } = require('util');
const treeKillAsync = promisify(require('tree-kill'));
const { parseSettings, SettingsFilter } = require('./settings');
const { CA_CERT_PATH, ES_P12_PATH, ES_P12_PASSWORD } = require('@kbn/dev-utils');
const readFile = util.promisify(fs.readFile);

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
    this._log = log;
    this._ssl = ssl;
    this._caCertPromise = ssl ? readFile(CA_CERT_PATH) : undefined;
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
   * Unpakcs a tar or zip file containing the data directory for an
   * ES cluster.
   *
   * @param {String} installPath
   * @param {String} archivePath
   */
  async extractDataDirectory(installPath, archivePath) {
    this._log.info(chalk.bold(`Extracting data directory`));
    this._log.indent(4);

    // decompress excludes the root directory as that is how our archives are
    // structured. This works in our favor as we can explicitly extract into the data dir
    const extractPath = path.resolve(installPath, 'data');
    this._log.info(`Data archive: ${archivePath}`);
    this._log.info(`Extract path: ${extractPath}`);

    await decompress(archivePath, extractPath);

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
        first(this._process.stdout, (data) => {
          if (/started/.test(data)) {
            return true;
          }
        }),
        this._nativeRealmSetup,
      ]),

      // await the outcome of the process in case it exits before starting
      this._outcome.then(() => {
        throw createCliError('ES exited without starting');
      }),
    ]);
  }

  /**
   * Starts Elasticsearch and waits for Elasticsearch to exit
   *
   * @param {String} installPath
   * @param {Object} options
   * @property {Array} options.esArgs
   * @returns {Promise<undefined>}
   */
  async run(installPath, options = {}) {
    this._exec(installPath, options);

    // log native realm setup errors so they aren't uncaught
    this._nativeRealmSetup.catch((error) => {
      this._log.error(error);
      this.stop();
    });

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
   * @param {Object} options
   * @property {string|Array} options.esArgs
   * @property {string} options.esJavaOpts
   * @return {undefined}
   */
  _exec(installPath, options = {}) {
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
      esArgs.push(`xpack.security.http.ssl.keystore.path=${ES_P12_PATH}`);
      esArgs.push(`xpack.security.http.ssl.keystore.type=PKCS12`);
      esArgs.push(`xpack.security.http.ssl.keystore.password=${ES_P12_PASSWORD}`);
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
      esJavaOpts += ' -Xms1g -Xmx1g';
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

    // parse log output to find http port
    const httpPort = first(this._process.stdout, (data) => {
      const match = data.toString('utf8').match(/HttpServer.+publish_address {[0-9.]+:([0-9]+)/);

      if (match) {
        return match[1];
      }
    });

    // once the http port is available setup the native realm
    this._nativeRealmSetup = httpPort.then(async (port) => {
      const caCert = await this._caCertPromise;
      const nativeRealm = new NativeRealm({
        port,
        caCert,
        log: this._log,
        elasticPassword: options.password,
        ssl: this._ssl,
      });
      await nativeRealm.setPasswords(options);
    });

    // parse and forward es stdout to the log
    this._process.stdout.on('data', (data) => {
      const lines = parseEsLog(data.toString());
      lines.forEach((line) => {
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
        throw createCliError(`ES exited with code ${code}`);
      }
    });
  }
};
