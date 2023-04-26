/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { MatcherFunction } from 'expect';
import { LogRecord } from '@kbn/logging';

const toContainLogEntry: MatcherFunction<[entry: string]> = (actual, entry) => {
  if (!Array.isArray(actual)) {
    throw new Error('actual must be an array');
  }
  const logEntries = actual as LogRecord[];
  if (logEntries.find((item) => item.message.includes(entry))) {
    return {
      pass: true,
      message: () => `Entry "${entry}" found in log file`,
    };
  } else {
    return {
      pass: false,
      message: () => `Entry "${entry}" not found in log file`,
    };
  }
};

expect.extend({
  toContainLogEntry,
});

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toContainLogEntry(entry: string): R;
    }
  }
}
