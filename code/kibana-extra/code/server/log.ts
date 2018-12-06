/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import { inspect } from 'util';
import { Logger } from 'vscode-jsonrpc';
export { Logger } from 'vscode-jsonrpc';

export class Log implements Logger {
  constructor(private server: Hapi.Server, private baseTags: string[] = ['code']) {}

  public info(msg: string | any) {
    if (typeof msg !== 'string') {
      msg = inspect(msg, {
        colors: process.stdout.isTTY,
      });
    }

    this.server.log([...this.baseTags, 'info'], msg);
  }

  public error(msg: string | any) {
    if (msg instanceof Error) {
      msg = msg.stack;
    }

    if (typeof msg !== 'string') {
      msg = inspect(msg, {
        colors: process.stdout.isTTY,
      });
    }

    this.server.log([...this.baseTags, 'error'], msg);
  }

  public log(message: string): void {
    this.info(message);
  }

  public debug(msg: string | any) {
    if (typeof msg !== 'string') {
      msg = inspect(msg, {
        colors: process.stdout.isTTY,
      });
    }

    this.server.log([...this.baseTags, 'debug'], msg);
  }

  public warn(msg: string | any): void {
    if (msg instanceof Error) {
      msg = msg.stack;
    }

    if (typeof msg !== 'string') {
      msg = inspect(msg, {
        colors: process.stdout.isTTY,
      });
    }

    this.server.log([...this.baseTags, 'warning'], msg);
  }
}
