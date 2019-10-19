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

import fs from 'fs';
import { throttle } from 'lodash';
import { basename, dirname, sep } from 'path';

export class LogRotator {
  constructor(config, logReporterStream) {
    this.logReporterStream = logReporterStream;
    this.logFilePath = config.get('logging.dest');
    this.interval = config.get('logging.rotate.interval');
    this.everyBytes = config.get('logging.rotate.everyBytes');
    this.keepFiles = config.get('logging.rotate.keepFiles');
    this.onStartup = config.get('logging.rotate.onStartup');
    this.running = false;
    this.logFileSize = 0;
    this.intervalID = 0;
    this.lastRotateTime = (new Date()).getTime();
    this.isRotating = false;
    this.throttledRotate = throttle(() => { this._rotate(); }, 5000);
    console.log(process.pid);
  }

  start() {
    if (this.running) {
      return;
    }

    // create exit listener for cleanup purposes
    this._createExitListener();

    // init log file size monitor
    this._startLogFileSizeMonitor();

    // init log file interval monitor
    this._startLogFileIntervalMonitor();

    // call rotate in case we should try
    // to rotate on startup
    this._callRotateOnStartup();

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
    this._stopLogFileIntervalMonitor();

    this.running = false;
  }

  _startLogFileSizeMonitor() {
    this.logFileSize = this._getLogFileSize();
    this.logReporterStream.on('data', this._logFileSizeMonitorHandler.bind(this));
  }

  _logFileSizeMonitorHandler(chunk) {
    if (!chunk) {
      return;
    }

    this.logFileSize += chunk.length || 0;
    this.throttledRotate();
  }

  _stopLogFileSizeMonitor() {
    this.logReporterStream.removeListener('data', this._logFileIntervalMonitorHandler);
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
    if (this.onStartup) {
      this._rotate();
    }
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

    console.log(rotatedFiles);

    // delete last file
    this._deleteLastRotatedFile(rotatedFiles);

    // rename all files to correct index + 1
    this._renameRotatedFilesByOne(rotatedFiles);

    // rename + compress current log into 0
    this._rotateCurrentLogFile();

    // send SIGHUP to reload log configuration
    process.kill(process.pid, 'SIGHUP');

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
    fs.writeFileSync(this.logFilePath, '');
  }
}
