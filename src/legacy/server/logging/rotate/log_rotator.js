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

export class LogRotator {
  constructor(config, logInterceptor) {
    this.logInterceptor = logInterceptor;
    this.logFilePath = config.get('logging.dest');
    this.interval = config.get('logging.rotate.interval');
    this.everyBytes = config.get('logging.rotate.everyBytes');
    this.keepFiles = config.get('logging.rotate.keepFiles');
    this.onStartup = config.get('logging.rotate.onStartup');
    this.running = false;
    this.logFileSize = 0;

    throttle(this._rotate, 5000);
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

  }

  _logFileSizeMonitorHandle() {

  }

  _stopLogFileSizeMonitor() {

  }

  _startLogFileIntervalMonitor() {

  }

  _logFileIntervalMonitorHandle() {

  }

  _stopLogFileIntervalMonitor() {

  }

  _createExitListener() {
    process.on('exit', this.stop());
  }

  _deleteExitListener() {
    process.removeListener('exit', this.stop());
  }

  _getLogFileSize() {
    const logFileStats = fs.statSync(this.logFilePath);
    return logFileStats.size;
  }

  _callRotateOnStartup() {
    if (this.onStartup) {
      this._rotate();
    }
  }

  _shouldRotate() {
    return false;
  }

  _rotate() {
    if (!this._shouldRotate()) {
      return;
    }

    this._rotateNow();
  }

  _rotateNow() {
    // rename old
    // reload log configuration
    process.kill(process.pid, 'SIGHUP');
  }
}
