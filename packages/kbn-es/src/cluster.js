const childProcess = require('child_process');
const chalk = require('chalk');
const { installSnapshot, installSource, installArchive } = require('./install');
const { ES_BIN } = require('./paths');
const { log, parseEsLog, extractConfigFiles } = require('./utils');

exports.Cluster = class Cluster {
  /**
   * Builds and installs ES from source
   *
   * @param {Object} options
   * @property {Array} options.installPath
   * @property {Array} options.sourcePath
   * @returns {Promise}
   */
  async installSource(options = {}) {
    log.info(chalk.bold('Installing from source'));
    log.indent(2);

    const install = await installSource(options);

    log.indent(-2);

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
    log.info(chalk.bold('Installing from snapshot'));
    log.indent(2);

    const install = await installSnapshot(options);

    log.indent(-2);

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
    log.info(chalk.bold('Installing from an archive'));
    log.indent(2);

    const install = await installArchive(path, options);

    log.indent(-2);

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
    log.info(chalk.bold('Starting'));
    log.indent(2);

    const args = extractConfigFiles(esArgs, this._installPath).reduce(
      (acc, cur) => acc.concat(['-E', cur]),
      []
    );

    log.debug('%s %s', ES_BIN, args.join(' '));

    this._process = childProcess.spawn(ES_BIN, args, {
      cwd: installPath,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    this._process.stdout.on('data', data => {
      const lines = parseEsLog(data.toString());
      lines.forEach(line => log.info(line.formattedMessage));
    });

    this._process.stderr.on('data', data =>
      log.error(chalk.red(data.toString()))
    );

    log.indent(-2);

    return process;
  }

  /**
   * Stops ES process, if it's running
   */
  async stop() {
    if (this._process) {
      this._process.kill();
    }
  }
};
