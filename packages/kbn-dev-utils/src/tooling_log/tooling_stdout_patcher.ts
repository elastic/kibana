/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

type StdoutWriter = typeof process.stdout.write;
type Stdout = typeof process.stdout;
import chalk from 'chalk';
import stripAnsi from 'strip-ansi';
import { ansiEscapes } from './lib/ansi';

const patched: Stdout[] = [];

export class StdoutPatcher {
  stdout: Stdout;
  originalWrite: StdoutWriter;
  currentState: string[] = [];
  currentParsed: Map<string, string> = new Map();

  re = {
    optimizer: /\[@kbn\/optimizer\]\s+\[(\d+)\/(\d+)\]/,
    optimizerSuccess: /\[success\]\[@kbn\/optimizer\].*?/,
    kibanaServerRunning: /.*http\.server\.Kibana.*?http server running/,
    kibanaStatus: /.*?status.*?\sKibana\sis\snow\s(\w+)/,
  };

  constructor(stdout: Stdout) {
    this.stdout = stdout;
    this.originalWrite = this.stdout.write;
    if (!patched.includes(stdout)) {
      patched.push(stdout);
      this.stdout.write = this.customStdoutWrite.bind(this) as StdoutWriter;
    }
  }

  private customStdoutWrite(
    buffer: Uint8Array | string,
    ...args: [BufferEncoding, (err?: Error) => void]
  ): boolean {
    this.clearCurrentState();

    // print the actual line to output
    this.originalWrite.apply(this.stdout, [buffer, ...args]);
    this.renderNewState(buffer);

    return true;
  }

  private clearCurrentState() {
    this.originalWrite.call(this.stdout, ansiEscapes.cursorLeft);
    this.originalWrite.call(this.stdout, ansiEscapes.eraseLines(this.currentState.length));
  }

  private renderNewState(buffer: Uint8Array | string) {
    if (typeof buffer === 'string') {
      this.currentParsed = this.parseLine(this.currentParsed, buffer);
      this.currentState = [
        this.renderStatus(this.currentParsed) + '\n',
        this.renderProgress(this.currentParsed),
      ];

      for (let i = 0; i < this.currentState.length; i++) {
        this.originalWrite.call(this.stdout, this.currentState[i]);
      }
    }
  }

  private renderStatus(parsed: Map<string, string>) {
    let kibanaStatus = parsed.get('kibanaStatus') || chalk.italic('unknown');
    if (kibanaStatus.includes('available')) {
      kibanaStatus = chalk.bgGreen.black(kibanaStatus);
    } else if (kibanaStatus.includes('degraded')) {
      kibanaStatus = chalk.bgRed.white(kibanaStatus);
    }
    return `Kibana status is ${kibanaStatus}`;
  }

  private renderProgress(parsed: Map<string, string>) {
    if (parsed.has('optimizerSuccess')) {
      return 'Optimizer completed. ✅';
    } else if (!parsed.has('totalBundles')) {
      return 'Optimizer: initializing...';
    } else {
      const current = parseInt(parsed.get('progressBundles') || '0', 10);
      const total = parseInt(parsed.get('totalBundles') || '0', 10);
      return 'Optimizer ⌛: ' + this.renderProgressBar({ current, total });
    }
  }

  private parseLine(currentParsed: Map<string, string>, buffer: string): Map<string, string> {
    const line = stripAnsi(buffer);

    let match;

    // optimizer finished
    match = this.re.optimizerSuccess.exec(line);
    if (match) {
      currentParsed.set('optimizerSuccess', '1');
      return currentParsed;
    }

    // optimizer progress
    match = this.re.optimizer.exec(line);
    if (match) {
      currentParsed.set('totalBundles', match[2]);
      currentParsed.set('progressBundles', match[1]);
      return currentParsed;
    }

    // kibana started running
    match = this.re.kibanaServerRunning.exec(line);
    if (match) {
      currentParsed.set('kibanaStatus', 'server running');
      return currentParsed;
    }

    match = this.re.kibanaStatus.exec(line);
    if (match) {
      currentParsed.set('kibanaStatus', match[1]);
      return currentParsed;
    }

    return currentParsed;
  }

  private renderProgressBar({ current, total }: { current: number; total: number }): string {
    let currentPercentage = 0;
    const totalPercentage = 100;

    // modify the left number to adjust the max cols in terminal
    const widthMultiplier = 30 / 100;

    if (total >= current) {
      currentPercentage = Math.floor((current * 100) / total);
    }

    const dots = '.'.repeat(currentPercentage * widthMultiplier);
    const empty = ' '.repeat((totalPercentage - currentPercentage) * widthMultiplier);

    return `${currentPercentage}% [${dots}${empty}] %`;
  }

  unpatch() {
    if (this.stdout.write !== this.originalWrite) {
      this.stdout.write = this.originalWrite;
      patched.splice(patched.indexOf(this.stdout), 1);
    }
  }
}
