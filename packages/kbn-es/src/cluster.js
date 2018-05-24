/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

const execa = require('execa');
const chalk = require('chalk');
const { installSnapshot, installSource, installArchive } = require('./install');
const { ES_BIN } = require('./paths');
const { log: defaultLog, parseEsLog, extractConfigFiles } = require('./utils');
const { createCliError } = require('./errors');

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
   * Starts ES and returns resolved promise once started
   *
   * @param {String} installPath
   * @param {Object} options
   * @property {Array} options.esArgs
   * @returns {Promise}
   */
  async start(installPath, options = {}) {
    this._exec(installPath, options);

    await Promise.race([
      // await the "started" log message
      new Promise(resolve => {
        this._process.stdout.on('data', data => {
          if (/started/.test(data)) {
            resolve();
          }
        });
      }),

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

    // await the final outcome of the process
    await this._outcome;
  }

  /**
   * Stops ES process, if it's running
   *
   * @returns {Promise}
   */
  async stop() {
    if (!this._process || !this._outcome) {
      throw new Error('ES has not been started');
    }

    this._process.kill();
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
   * @property {Array} options.esArgs
   * @return {undefined}
   */
  _exec(installPath, { esArgs = [] }) {
    if (this._process || this._outcome) {
      throw new Error('ES has already been started');
    }

    this._log.info(chalk.bold('Starting'));
    this._log.indent(4);

    const args = extractConfigFiles(esArgs, installPath, {
      log: this._log,
    }).reduce((acc, cur) => acc.concat(['-E', cur]), []);

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
      this._process.once('exit', code => {
        // JVM exits with 143 on SIGTERM and 130 on SIGINT, dont' treat them as errors
        if (code > 0 && !(code === 143 || code === 130)) {
          reject(createCliError(`ES exited with code ${code}`));
        } else {
          resolve();
        }
      });
    });
  }
};
