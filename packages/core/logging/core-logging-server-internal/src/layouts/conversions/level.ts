/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import chalk from 'chalk';
import { LogRecord, LogLevel } from '@kbn/logging';
import type { Conversion } from '@kbn/core-logging-common-internal';

const LEVEL_COLORS = new Map([
  [LogLevel.Fatal, chalk.red],
  [LogLevel.Error, chalk.red],
  [LogLevel.Warn, chalk.yellow],
  [LogLevel.Debug, chalk.green],
  [LogLevel.Trace, chalk.blue],
]);

export const LevelConversion: Conversion = {
  pattern: /%level/g,
  convert(record: LogRecord, highlight: boolean) {
    let message = record.level.id.toUpperCase().padEnd(5);
    if (highlight && LEVEL_COLORS.has(record.level)) {
      const color = LEVEL_COLORS.get(record.level)!;
      message = color(message);
    }
    return message;
  },
};
