/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import chalk from 'chalk';
import { LogRecord } from '@kbn/logging';
import type { Conversion } from '@kbn/core-logging-common-internal';

export const LoggerConversion: Conversion = {
  pattern: /%logger/g,
  convert(record: LogRecord, highlight: boolean) {
    let message = record.context;
    if (highlight) {
      message = chalk.magenta(message);
    }
    return message;
  },
};
