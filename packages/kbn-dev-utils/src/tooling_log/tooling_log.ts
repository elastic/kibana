/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Rx from 'rxjs';

import { ToolingLogTextWriter, ToolingLogTextWriterConfig } from './tooling_log_text_writer';
import { Writer } from './writer';
import { Message, MessageTypes } from './message';

export class ToolingLog {
  private indentWidth = 0;
  private writers: Writer[];
  private readonly written$: Rx.Subject<Message>;

  constructor(writerConfig?: ToolingLogTextWriterConfig) {
    this.writers = writerConfig ? [new ToolingLogTextWriter(writerConfig)] : [];
    this.written$ = new Rx.Subject();
  }

  public getIndent() {
    return this.indentWidth;
  }

  public indent<T>(delta = 0, block?: () => Promise<T>) {
    const originalWidth = this.indentWidth;
    this.indentWidth = Math.max(this.indentWidth + delta, 0);
    if (!block) {
      return;
    }

    return (async () => {
      try {
        return await block();
      } finally {
        this.indentWidth = originalWidth;
      }
    })();
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
      indent: this.indentWidth,
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
