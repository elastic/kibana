/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  ToolingLog,
  ToolingLogTextWriter,
  LogLevel,
  parseLogLevel,
  ParsedLogLevel,
} from '@kbn/dev-utils/tooling_log';

class Log extends ToolingLog {
  private logLevel!: ParsedLogLevel;

  constructor() {
    super();
    this.setLogLevel('info');
  }

  setLogLevel(level: LogLevel) {
    this.logLevel = parseLogLevel(level);
    this.setWriters([
      new ToolingLogTextWriter({
        level: this.logLevel.name,
        writeTo: process.stdout,
      }),
    ]);
  }

  wouldLogLevel(level: LogLevel) {
    return this.logLevel.flags[level];
  }
}

export const log = new Log();
export type { LogLevel };
export { Log };
