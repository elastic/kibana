/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { ansiEscapes } from './lib/ansi';

type StdoutWriter = typeof process.stdout.write;
type Stdout = typeof process.stdout;

const patched: Stdout[] = [];

export class StdoutPatcher {
  stdout: Stdout;
  originalWrite: StdoutWriter;
  currentStatus: string[] = [];

  constructor(stdout: Stdout) {
    this.stdout = stdout;
    this.originalWrite = this.stdout.write;

    // prevent the same object to be patched twice
    if (!patched.includes(stdout)) {
      this.stdout.write = this.customStdoutWrite.bind(this) as StdoutWriter;
    }
  }

  customStdoutWrite(
    buffer: Uint8Array | string,
    ...args: [BufferEncoding, (err?: Error) => void]
  ): boolean {
    this.originalWrite.call(this.stdout, ansiEscapes.eraseLine);
    this.originalWrite.call(this.stdout, ansiEscapes.cursorLeft);
    this.originalWrite.apply(this.stdout, [buffer, ...args]);
    return this.originalWrite.call(this.stdout, 'now with classes =>> ' + Math.random());
  }
}
