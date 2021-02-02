/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

/* eslint-disable max-classes-per-file */

import Chalk from 'chalk';

export interface Log {
  good(label: string, ...args: any[]): void;
  warn(label: string, ...args: any[]): void;
  bad(label: string, ...args: any[]): void;
  write(...args: any[]): void;
}

export class CliLog implements Log {
  constructor(private readonly quiet: boolean, private readonly silent: boolean) {}

  good(label: string, ...args: any[]) {
    if (this.quiet || this.silent) {
      return;
    }

    // eslint-disable-next-line no-console
    console.log(Chalk.black.bgGreen(` ${label.trim()} `), ...args);
  }

  warn(label: string, ...args: any[]) {
    if (this.quiet || this.silent) {
      return;
    }

    // eslint-disable-next-line no-console
    console.log(Chalk.black.bgYellow(` ${label.trim()} `), ...args);
  }

  bad(label: string, ...args: any[]) {
    if (this.silent) {
      return;
    }

    // eslint-disable-next-line no-console
    console.log(Chalk.white.bgRed(` ${label.trim()} `), ...args);
  }

  write(...args: any[]) {
    // eslint-disable-next-line no-console
    console.log(...args);
  }
}

export class TestLog implements Log {
  public readonly messages: Array<{ type: string; args: any[] }> = [];

  bad(label: string, ...args: any[]) {
    this.messages.push({
      type: 'bad',
      args: [label, ...args],
    });
  }

  good(label: string, ...args: any[]) {
    this.messages.push({
      type: 'good',
      args: [label, ...args],
    });
  }

  warn(label: string, ...args: any[]) {
    this.messages.push({
      type: 'warn',
      args: [label, ...args],
    });
  }

  write(...args: any[]) {
    this.messages.push({
      type: 'write',
      args,
    });
  }
}
