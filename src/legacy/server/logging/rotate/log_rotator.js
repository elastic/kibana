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
import { workers } from 'cluster';
import fs from 'fs';
import { throttle } from 'lodash';
import { tmpdir } from 'os';
import { basename, dirname, join, sep } from 'path';

export class LogRotator {
  constructor(config) {
    this.logFilePath = config.get('logging.dest');
    this.interval = 1;
    this.everyBytes = config.get('logging.rotate.everyBytes');
    this.keepFiles = config.get('logging.rotate.keepFiles');
    this.running = false;
    this.logFileSize = 0;
    this.intervalID = 0;
    this.lastRotateTime = (new Date()).getTime();
    this.isRotating = false;
    this.throttledRotate = throttle(() => { this._rotate(); }, 5000);
    this.stalker = null;
    this.usePolling = true;
    this.stalkerUsePollingPolicyTestTimeout = null;
  }

  start() {
    if (this.running) {
      return;
    }

    // create exit listener for cleanup purposes
    this._createExitListener();

    // call rotate on startup
    this._callRotateOnStartup();

    // init log file size monitor
    this._startLogFileSizeMonitor();

    // init log file interval monitor
    // this._startLogFileIntervalMonitor();

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

    // stop log file interval monitor
    // this._stopLogFileIntervalMonitor();

    this.running = false;
  }

  _startLogFileSizeMonitor() {
    // Setup a test file in order to try the fs env
    // and understand if we need to usePolling or not
    const tempFileDir = fs.mkdtempSync(tmpdir());
    const tempFile = join(tempFileDir, 'kbn_log_rotation_test_file.log');
    fs.writeFileSync(tempFile, '');

    // setup watcher and wait for changes on test file
    this.stalker = chokidar.watch(tempFile, this._buildWatchCfg());
    this.stalker.on('change', () => {
      this.usePolling = false;
      // Sometimes chokidar is emit an exception on close due to a bug
      // so we need to do this to prevent it
      setTimeout(()=> this._completeUsePollingPolicyTest(tempFile), 0);
    });
    this.stalker.on('ready', () => fs.writeFileSync(tempFile, 'test'));

    // in case the watchers without usePolling do not work
    // we fallback after 10s and start usePolling mechanism
    this.stalkerUsePollingPolicyTestTimeout = setTimeout(() => this._completeUsePollingPolicyTest(tempFile), 10000);
  }

  _completeUsePollingPolicyTest(tempFile) {
    // if we have already call that function, return
    if (!this.stalkerUsePollingPolicyTestTimeout) {
      return;
    }

    // clear the timeout anyway if we reach that far
    clearTimeout(this.stalkerUsePollingPolicyTestTimeout);
    this.stalkerUsePollingPolicyTestTimeout = null;

    // close the watcher for test file
    // and delete it
    this.stalker.close();
    fs.unlinkSync(tempFile);

    // start the real watcher for the log file
    // with the correct usePolling option
    this.stalker = chokidar.watch(this.logFilePath, this._buildWatchCfg(this.usePolling));
    this.stalker.on('change', this._logFileSizeMonitorHandler.bind(this));
  }

  _buildWatchCfg(usePolling = false) {
    return {
      ignoreInitial: true,
      usePolling,
      interval: 10000,
      binaryInterval: 10000,
      alwaysStat: true,
      atomic: false
    };
  }

  _logFileSizeMonitorHandler(filename, stats) {
    if (!filename || !stats) {
      return;
    }

    this.logFileSize += stats.size || 0;
    this.throttledRotate();
  }

  _stopLogFileSizeMonitor() {
    if (!this.stalker) {
      return;
    }

    this.stalker.close();
    clearTimeout(this.stalkerUsePollingPolicyTestTimeout);
  }

  _startLogFileIntervalMonitor() {
    if (!this.interval) {
      return;
    }

    this.intervalID = setInterval(this._logFileIntervalMonitorHandler.bind(this), this.interval * 60 * 1000);
  }

  _logFileIntervalMonitorHandler() {
    this._rotate();
  }

  _stopLogFileIntervalMonitor() {
    if (!this.intervalID) {
      return;
    }

    clearInterval(this.intervalID);
    this.intervalID = 0;
  }

  _createExitListener() {
    process.on('exit', this.stop.bind(this));
  }

  _deleteExitListener() {
    process.removeListener('exit', this.stop);
  }

  _getLogFileSize() {
    try {
      const logFileStats = fs.statSync(this.logFilePath);
      return logFileStats.size;
    } catch {
      return 0;
    }
  }

  _callRotateOnStartup() {
    this.logFileSize = this._getLogFileSize();
    this._rotate();
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

    if (this.logFileSize >= this.everyBytes) {
      return true;
    }

    const currentTime = (new Date()).getTime();
    const elapsedTime = Math.round((currentTime - this.lastRotateTime) / 1000);

    console.log('elapsedTime: ' + elapsedTime + ' interval: ' + this.interval * 60);
    return elapsedTime >= this.interval * 30;
  }

  _rotate() {
    console.log('logSize: ' + this.logFileSize + ' limit: ' + this.everyBytes);
    if (!this._shouldRotate()) {
      console.log('no');
      return;
    }

    console.log('yes');
    this._rotateNow();
  }

  _rotateNow() {
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
    const rotatedFiles = this._readRotatedFilesMetadata();

    // delete last file
    this._deleteLastRotatedFile(rotatedFiles);

    // rename all files to correct index + 1
    // and normalize
    this._renameRotatedFilesByOne(rotatedFiles);

    // rename + compress current log into 0
    this._rotateCurrentLogFile();

    // send SIGHUP to reload log configuration
    this._sendReloadLogConfigSignal();

    // Reset log file size
    this.logFileSize = 0;

    // Reset last rotate time
    this.lastRotateTime = (new Date()).getTime();

    // rotate process is finished
    this.isRotating = false;
  }

  _readRotatedFilesMetadata() {
    const logFileBaseName = basename(this.logFilePath);
    const logFilesFolder = dirname(this.logFilePath);

    return fs.readdirSync(logFilesFolder)
      .filter(file => new RegExp(`${logFileBaseName}\\.\\d`).test(file))
      .sort((a, b) => Number(a.match(/(\d+)/g)[0]) - Number(b.match(/(\d+)/g)[0]))
      .map(filename => `${logFilesFolder}${sep}${filename}`)
      .filter(filepath => fs.existsSync(filepath));
  }

  _deleteLastRotatedFile(rotatedFiles) {
    if (rotatedFiles.length < this.keepFiles) {
      return;
    }

    const lastFilePath = rotatedFiles.pop();
    fs.unlinkSync(lastFilePath);
  }

  _renameRotatedFilesByOne(rotatedFiles) {
    const logFileBaseName = basename(this.logFilePath);
    const logFilesFolder = dirname(this.logFilePath);

    for (let i = rotatedFiles.length - 1; i >= 0; i--) {
      const oldFilePath = rotatedFiles[i];
      const newFilePath = `${logFilesFolder}${sep}${logFileBaseName}.${i + 1}`;
      fs.renameSync(oldFilePath, newFilePath);
    }
  }

  _rotateCurrentLogFile() {
    const newFilePath = `${this.logFilePath}.0`;
    fs.renameSync(this.logFilePath, newFilePath);
  }

  _sendReloadLogConfigSignal() {
    process.kill(process.pid, 'SIGHUP');

    Object.values(workers).forEach((worker) => {
      process.kill(worker.process.pid, 'SIGHUP');
    });
  }
}
