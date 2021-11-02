/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

type StdoutWriter = typeof process.stdout.write;
type Stdout = typeof process.stdout;
import stripAnsi from 'strip-ansi';
import { ansiEscapes } from './ansi_codes';

const patched: Stdout[] = [];

export interface StatusRenderer {
  render: (line: string, rawLine: string) => string[];
}

export class StdoutPatcher {
  stdout: Stdout;
  originalWrite: StdoutWriter;
  currentState: string[] = [];
  currentParsed: Map<string, string> = new Map();
  renderer: StatusRenderer;
  maxWidth = 30;

  constructor(stdout: Stdout, renderer: StatusRenderer) {
    this.stdout = stdout;
    this.originalWrite = this.stdout.write;
    this.renderer = renderer;
    this.maxWidth = stdout.columns;
    if (!patched.includes(stdout)) {
      patched.push(stdout);
      this.stdout.write = this.customStdoutWrite.bind(this) as StdoutWriter;
    }
  }

  private customStdoutWrite(
    buffer: Uint8Array | string,
    ...args: [BufferEncoding, (err?: Error) => void]
  ): boolean {
    this.clearCurrent();

    // print the actual line to output
    this.originalWrite.apply(this.stdout, [buffer, ...args]);
    this.render(buffer);

    return true;
  }

  private clearCurrent() {
    this.originalWrite.call(this.stdout, ansiEscapes.cursorLeft);
    this.originalWrite.call(this.stdout, ansiEscapes.eraseLines(this.currentState.length));
  }

  private render(buffer: Uint8Array | string) {
    if (typeof buffer === 'string') {
      this.currentState = this.renderer.render(stripAnsi(buffer), buffer);
      for (let i = 0; i < this.currentState.length; i++) {
        let prefix = '';
        if (i > 0 && i < this.currentState.length) {
          prefix = '\n';
        }
        this.originalWrite.call(this.stdout, prefix + this.trimLine(this.currentState[i]));
      }
    }
  }

  trimLine(line: string): string {
    return line.substr(0, this.maxWidth - 1);
  }
  unpatch() {
    if (this.stdout.write !== this.originalWrite) {
      this.stdout.write = this.originalWrite;
      patched.splice(patched.indexOf(this.stdout), 1);
    }
  }
}
