const execa = require('execa');
const chalk = require('chalk');
const { installSnapshot, installSource, installArchive } = require('./install');
const { ES_BIN } = require('./paths');
const { log: defaultLog, parseEsLog, extractConfigFiles } = require('./utils');

exports.Cluster = class Cluster {
  constructor(log = defaultLog) {
    this._log = log;
  }

  /**
   * Builds and installs ES from source
   *
   * @param {Object} options
   * @property {Array} options.installPath
   * @property {Array} options.sourcePath
   * @returns {Promise}
   */
  async installSource(options = {}) {
    this._log.info(chalk.bold('Installing from source'));
    this._log.indent(4);

    const install = await installSource({ log: this._log, ...options });

    this._log.indent(-4);

    return install;
  }

  /**
   * Download and installs ES from a snapshot
   *
   * @param {Object} options
   * @property {Array} options.installPath
   * @property {Array} options.sourcePath
   * @returns {Promise}
   */
  async installSnapshot(options = {}) {
    this._log.info(chalk.bold('Installing from snapshot'));
    this._log.indent(4);

    const install = await installSnapshot({ log: this._log, ...options });

    this._log.indent(-4);

    return install;
  }

  /**
   * Installs ES from a local tar
   *
   * @param {String} path
   * @param {Object} options
   * @property {Array} options.installPath
   * @returns {Promise}
   */
  async installArchive(path, options = {}) {
    this._log.info(chalk.bold('Installing from an archive'));
    this._log.indent(4);

    const install = await installArchive(path, { log: this._log, ...options });

    this._log.indent(-4);

    return install;
  }

  /**
   * Starts ES and returns resolved promise once started
   *
   * @param {String} installPath
   * @param {Object} options
   * @property {Array} options.esArgs
   * @returns {Promise}
   */
  async start(installPath, options = {}) {
    await this.run(installPath, options);

    return new Promise(resolve => {
      this._process.stdout.on('data', data => {
        if (/started/.test(data)) {
          return resolve(process);
        }
      });
    });
  }

  /**
   * Starts Elasticsearch and immediately returns with process
   *
   * @param {String} installPath
   * @param {Object} options
   * @property {Array} options.esArgs
   * @returns {Process}
   */
  run(installPath, { esArgs = [] }) {
    this._log.info(chalk.bold('Starting'));
    this._log.indent(4);

    const args = extractConfigFiles(esArgs, this._installPath).reduce(
      (acc, cur) => acc.concat(['-E', cur]),
      []
    );

    this._log.debug('%s %s', ES_BIN, args.join(' '));

    this._process = execa(ES_BIN, args, {
      cwd: installPath,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    this._process.stdout.on('data', data => {
      const lines = parseEsLog(data.toString());
      lines.forEach(line => this._log.info(line.formattedMessage));
    });

    this._process.stderr.on('data', data =>
      this._log.error(chalk.red(data.toString()))
    );

    this._outcome = new Promise((resolve, reject) => {
      this._process.on('exit', code => {
        // JVM exits with 143 on SIGTERM and 130 on SIGINT, dont' treat then as errors
        if (code > 0 && !(code === 143 || code === 130)) {
          return reject(`ES exitted with code ${code}`);
        }

        resolve();
      });
    });

    return process;
  }

  /**
   * Stops ES process, if it's running
   *
   * @returns {Promise}
   */
  stop() {
    if (!this._process || !this._outcome) {
      return Promise.reject('ES has not been started');
    }

    this._process.kill();
    return this._outcome;
  }
};
