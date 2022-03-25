/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CliLog, LogLevel } from './cli_log';

export class TestLog extends CliLog {
  messages: string[] = [];
  constructor(level: LogLevel = 'verbose') {
    super(level, {
      write: (chunk) => {
        this.messages.push(chunk);
      },
    });
  }
}
