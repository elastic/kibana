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

import { ToolingLogTextWriter, ToolingLogTextWriterConfig } from './tooling_log_text_writer';
import { Writer } from './writer';
import { Message, MessageTypes } from './message';

export class ToolingLog {
  private identWidth = 0;
  private writers: Writer[];
  private readonly written$: Rx.Subject<Message>;

  constructor(writerConfig?: ToolingLogTextWriterConfig) {
    this.writers = writerConfig ? [new ToolingLogTextWriter(writerConfig)] : [];
    this.written$ = new Rx.Subject();
  }

  public indent(delta = 0) {
    this.identWidth = Math.max(this.identWidth + delta, 0);
    return this.identWidth;
  }

  public verbose(...args: any[]) {
    this.sendToWriters('verbose', args);
  }

  public debug(...args: any[]) {
    this.sendToWriters('debug', args);
  }

  public info(...args: any[]) {
    this.sendToWriters('info', args);
  }

  public success(...args: any[]) {
    this.sendToWriters('success', args);
  }

  public warning(...args: any[]) {
    this.sendToWriters('warning', args);
  }

  public error(error: Error | string) {
    this.sendToWriters('error', [error]);
  }

  public write(...args: any[]) {
    this.sendToWriters('write', args);
  }

  public getWriters() {
    return this.writers.slice(0);
  }

  public setWriters(writers: Writer[]) {
    this.writers = [...writers];
  }

  public getWritten$() {
    return this.written$.asObservable();
  }

  private sendToWriters(type: MessageTypes, args: any[]) {
    const msg = {
      type,
      indent: this.identWidth,
      args,
    };

    let written = false;
    for (const writer of this.writers) {
      if (writer.write(msg)) {
        written = true;
      }
    }

    if (written) {
      this.written$.next(msg);
    }
  }
}
