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

import * as chokidar from 'chokidar';
import { isMaster } from 'cluster';
import fs from 'fs';
import { once, throttle } from 'lodash';
import { tmpdir } from 'os';
import { basename, dirname, join, sep } from 'path';
import { promisify } from 'util';

const mkdirAsync = promisify(fs.mkdir);
const readdirAsync = promisify(fs.readdir);
const renameAsync = promisify(fs.rename);
const statAsync = promisify(fs.stat);
const unlinkAsync = promisify(fs.unlink);
const writeFileAsync = promisify(fs.writeFile);

export class LogRotator {
  constructor(config) {
    this.logFilePath = config.get('logging.dest');
    this.interval = 1;
    this.everyBytes = config.get('logging.rotate.everyBytes');
    this.keepFiles = config.get('logging.rotate.keepFiles');
    this.running = false;
    this.logFileSize = 0;
    this.isRotating = false;
    this.throttledRotate = throttle(async () => { await this._rotate(); }, 5000);
    this.stalker = null;
    this.usePolling = config.get('logging.rotate.usePolling');
    this.pollingInterval = config.get('logging.rotate.pollingInterval') * 1000;
    this.stalkerUsePollingPolicyTestTimeout = null;
  }

  async start() {
    if (this.running) {
      return;
    }

    // create exit listener for cleanup purposes
    this._createExitListener();

    // call rotate on startup
    await this._callRotateOnStartup();

    // init log file size monitor
    await this._startLogFileSizeMonitor();

    this.running = true;
  }

  stop() {
    if (!this.running) {
      return;
    }

    // cleanup exit listener
    this._deleteExitListener();

    // stop log file size monitor
    this._stopLogFileSizeMonitor();

    this.running = false;
  }

  async _shouldUsePolling() {
    try {
      // Setup a test file in order to try the fs env
      // and understand if we need to usePolling or not
      const tempFileDir = tmpdir();
      const tempFile = join(tempFileDir, 'kbn_log_rotation_use_polling_test_file.log');

      await mkdirAsync(tempFileDir, { recursive: true });
      await writeFileAsync(tempFile, '');

      const testWatcher = fs.watch(tempFile, { persistent: false });

      return new Promise(async (resolve) => {
        let fallbackTimeout = null;

        const onResolve = once(async (resolve, completeStatus) => {
          clearTimeout(fallbackTimeout);

          testWatcher.close();
          await unlinkAsync(tempFile);
          resolve(completeStatus);
        });

        fallbackTimeout = setTimeout(async () => {
          await onResolve(resolve, true);
        }, 15000);

        testWatcher.on('change', async () => {
          await onResolve(resolve, false);
        });

        testWatcher.on('error', async () => {
          await onResolve(resolve, true);
        });

        await writeFileAsync(tempFile, 'test');
      });
    } catch {
      return true;
    }
  }

  _buildWatchCfg(usePolling = false) {
    return {
      ignoreInitial: true,
      awaitWriteFinish: false,
      useFsEvents: false,
      usePolling,
      interval: this.pollingInterval,
      binaryInterval: this.pollingInterval,
      alwaysStat: true,
      atomic: false
    };
  }

  async _startLogFileSizeMonitor() {
    this.usePolling = await this._shouldUsePolling();
    this.stalker = chokidar.watch(this.logFilePath, this._buildWatchCfg(this.usePolling));
    this.stalker.on('change', async (filename, stats) => await this._logFileSizeMonitorHandler.bind(this)(filename, stats));
  }

  async _logFileSizeMonitorHandler(filename, stats) {
    if (!filename || !stats) {
      return;
    }

    this.logFileSize = stats.size || 0;
    await this.throttledRotate();
  }

  _stopLogFileSizeMonitor() {
    if (!this.stalker) {
      return;
    }

    this.stalker.close();
    clearTimeout(this.stalkerUsePollingPolicyTestTimeout);
  }

  _createExitListener() {
    process.on('exit', this.stop.bind(this));
  }

  _deleteExitListener() {
    process.removeListener('exit', this.stop);
  }

  async _getLogFileSizeAndCreateIfNeeded() {
    try {
      const logFileStats = await statAsync(this.logFilePath);
      return logFileStats.size;
    } catch {
      // touch the file to make the watcher being able to register
      // change events
      await writeFileAsync(this.logFilePath, '');
      return 0;
    }
  }

  async _callRotateOnStartup() {
    this.logFileSize = await this._getLogFileSizeAndCreateIfNeeded();
    await this._rotate();
  }

  _shouldRotate() {
    // should rotate evaluation
    // 1. should rotate if current log size exceeds
    //    the defined one on everyBytes or has already
    //    pass the defined time on interval.
    // 2. should not rotate if is already rotating or if any
    //    of the conditions on 1. do not apply
    if (this.isRotating) {
      return false;
    }

    return this.logFileSize >= this.everyBytes;
  }

  async _rotate() {
    if (!this._shouldRotate()) {
      return;
    }

    await this._rotateNow();
  }

  async _rotateNow() {
    // rotate process
    // 1. get rotated files metadata (list of log rotated files present on the log folder, numerical sorted)
    // 2. delete last file
    // 3. rename all files to the correct index +1
    // 4. rename + compress current log into 1
    // 5. send SIGHUP to reload log config
    if (this.isRotating) {
      return false;
    }

    // rotate process is starting
    this.isRotating = true;

    // get rotated files metadata
    const rotatedFiles = await this._readRotatedFilesMetadata();

    // delete last file
    await this._deleteLastRotatedFile(rotatedFiles);

    // rename all files to correct index + 1
    // and normalize
    await this._renameRotatedFilesByOne(rotatedFiles);

    // rename + compress current log into 0
    await this._rotateCurrentLogFile();

    // send SIGHUP to reload log configuration
    this._sendReloadLogConfigSignal();

    // Reset log file size
    this.logFileSize = 0;

    // rotate process is finished
    this.isRotating = false;
  }

  async _readRotatedFilesMetadata() {
    const logFileBaseName = basename(this.logFilePath);
    const logFilesFolder = dirname(this.logFilePath);

    return (await readdirAsync(logFilesFolder))
      .filter(file => new RegExp(`${logFileBaseName}\\.\\d`).test(file))
      .sort((a, b) => Number(a.match(/(\d+)/g)[0]) - Number(b.match(/(\d+)/g)[0]))
      .map(filename => `${logFilesFolder}${sep}${filename}`)
      .filter(filepath => fs.existsSync(filepath));
  }

  async _deleteLastRotatedFile(rotatedFiles) {
    if (rotatedFiles.length < this.keepFiles) {
      return;
    }

    const lastFilePath = rotatedFiles.pop();
    await unlinkAsync(lastFilePath);
  }

  async _renameRotatedFilesByOne(rotatedFiles) {
    const logFileBaseName = basename(this.logFilePath);
    const logFilesFolder = dirname(this.logFilePath);

    for (let i = rotatedFiles.length - 1; i >= 0; i--) {
      const oldFilePath = rotatedFiles[i];
      const newFilePath = `${logFilesFolder}${sep}${logFileBaseName}.${i + 1}`;
      await renameAsync(oldFilePath, newFilePath);
    }
  }

  async _rotateCurrentLogFile() {
    const newFilePath = `${this.logFilePath}.0`;
    await renameAsync(this.logFilePath, newFilePath);
  }

  _sendReloadLogConfigSignal() {
    if (isMaster) {
      process.emit('SIGHUP');
      return;
    }

    // Send a special message to the cluster manager
    // so it can forward it correctly
    // It will only run when we are under cluster mode (not under a production environment)
    process.send(['RELOAD_LOGGING_CONFIG_FROM_SERVER_WORKER']);
  }
}
