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

import * as Rx from 'rxjs';
import { EventEmitter } from 'events';

import { ToolingLogTextWriter } from './tooling_log_text_writer';

export class ToolingLog extends EventEmitter {
  /**
   * Create a ToolingLog object
   * @param {WriterConfig} writerConfig
   */
  constructor(writerConfig) {
    super();

    this._indent = 0;
    this._writers = writerConfig ? [new ToolingLogTextWriter(writerConfig)] : [];
    this._written$ = new Rx.Subject();
  }

  indent(delta = 0) {
    this._indent = Math.max(this._indent + delta, 0);
    return this._indent;
  }

  verbose(...args) {
    this._write('verbose', args);
  }

  debug(...args) {
    this._write('debug', args);
  }

  info(...args) {
    this._write('info', args);
  }

  success(...args) {
    this._write('success', args);
  }

  warning(...args) {
    this._write('warning', args);
  }

  error(error) {
    this._write('error', [error]);
  }

  write(...args) {
    this._write('write', args);
  }

  getWriters() {
    return this._writers.slice(0);
  }

  setWriters(writers) {
    this._writers = [...writers];
  }

  getWritten$() {
    return this._written$.asObservable();
  }

  _write(type, args) {
    const msg = {
      type,
      indent: this._indent,
      args,
    };

    let written = false;
    for (const writer of this._writers) {
      if (writer.write(msg)) {
        written = true;
      }
    }

    if (written) {
      this._written$.next(msg);
    }
  }
}
