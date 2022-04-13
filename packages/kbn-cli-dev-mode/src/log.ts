/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-disable max-classes-per-file */

import Chalk from 'chalk';
import { ToolingLog } from '@kbn/dev-utils';

export interface Log {
  toolingLog: ToolingLog;
  good(label: string, ...args: any[]): void;
  warn(label: string, ...args: any[]): void;
  bad(label: string, ...args: any[]): void;
  write(...args: any[]): void;
}

export class CliLog implements Log {
  public toolingLog: ToolingLog;

  constructor(private readonly silent: boolean) {
    this.toolingLog = new ToolingLog({
      level: this.silent ? 'silent' : 'info',
      writeTo: {
        write: (msg) => {
          this.write(msg);
        },
      },
    });
  }

  good(label: string, ...args: any[]) {
    if (this.silent) {
      return;
    }

    // eslint-disable-next-line no-console
    console.log(Chalk.black.bgGreen(` ${label.trim()} `), ...args);
  }

  warn(label: string, ...args: any[]) {
    if (this.silent) {
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
  public toolingLog = new ToolingLog({
    level: 'verbose',
    writeTo: {
      write: (msg) => {
        this.messages.push({ type: 'toolingLog', args: [msg] });
      },
    },
  });

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
