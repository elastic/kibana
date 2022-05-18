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

export interface ToolingLogOptions {
  /**
   * type name for this logger, will be assigned to the "source"
   * properties of messages produced by this logger
   */
  type?: string;
  /**
   * parent ToolingLog. When a ToolingLog has a parent they will both
   * share indent and writers state. Changing the indent width or
   * writers on either log will update the other too.
   */
  parent?: ToolingLog;
}

export class ToolingLog {
  private indentWidth$: Rx.BehaviorSubject<number>;
  private writers$: Rx.BehaviorSubject<Writer[]>;
  private readonly written$: Rx.Subject<Message>;
  private readonly type: string | undefined;

  constructor(writerConfig?: ToolingLogTextWriterConfig, options?: ToolingLogOptions) {
    this.indentWidth$ = options?.parent ? options.parent.indentWidth$ : new Rx.BehaviorSubject(0);

    this.writers$ = options?.parent
      ? options.parent.writers$
      : new Rx.BehaviorSubject<Writer[]>([]);
    if (!options?.parent && writerConfig) {
      this.writers$.next([new ToolingLogTextWriter(writerConfig)]);
    }

    this.written$ = options?.parent ? options.parent.written$ : new Rx.Subject();
    this.type = options?.type;
  }

  /**
   * Get the current indentation level of the ToolingLog
   */
  public getIndent() {
    return this.indentWidth$.getValue();
  }

  /**
   * Indent the output of the ToolingLog by some character (4 is a good choice usually).
   *
   * If provided, the `block` function will be executed and once it's promise is resolved
   * or rejected the indentation will be reset to its original state.
   *
   * @param delta the number of spaces to increase/decrease the indentation
   * @param block a function to run and reset any indentation changes after
   */
  public indent(delta: number): void;
  public indent<T>(delta: number, block: () => Promise<T>): Promise<T>;
  public indent<T>(delta: number, block: () => T): T;
  public indent<T>(delta = 0, block?: () => T | Promise<T>): void | T | Promise<T> {
    const originalWidth = this.indentWidth$.getValue();
    this.indentWidth$.next(Math.max(originalWidth + delta, 0));
    if (!block) {
      return;
    }

    const maybePromise: any = block();
    if (
      typeof maybePromise === 'object' &&
      maybePromise &&
      typeof maybePromise.then === 'function'
    ) {
      return (async () => {
        try {
          return await maybePromise;
        } finally {
          this.indentWidth$.next(originalWidth);
        }
      })();
    }

    this.indentWidth$.next(originalWidth);
    return maybePromise;
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
    return [...this.writers$.getValue()];
  }

  public setWriters(writers: Writer[]) {
    this.writers$.next([...writers]);
  }

  public getWritten$() {
    return this.written$.asObservable();
  }

  /**
   * Create a new ToolingLog which sets a different "type", allowing messages to be filtered out by "source"
   * @param type A string that will be passed along with messages from this logger which can be used to filter messages with `ignoreSources`
   */
  public withType(type: string) {
    return new ToolingLog(undefined, {
      type,
      parent: this,
    });
  }

  private sendToWriters(type: MessageTypes, args: any[]) {
    const indent = this.indentWidth$.getValue();
    const writers = this.writers$.getValue();
    const msg: Message = {
      type,
      indent,
      source: this.type,
      args,
    };

    let written = false;
    for (const writer of writers) {
      if (writer.write(msg)) {
        written = true;
      }
    }

    if (written) {
      this.written$.next(msg);
    }
  }
}
