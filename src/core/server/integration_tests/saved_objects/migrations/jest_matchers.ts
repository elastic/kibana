/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MatcherFunction } from 'expect';
import type { LogRecord } from '@kbn/logging';

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

const toContainLogEntries: MatcherFunction<[entries: string[], options: { ordered?: boolean }]> = (
  actual,
  entries,
  options = {}
) => {
  if (!Array.isArray(actual)) {
    throw new Error('actual must be an array');
  }
  const { ordered = true } = options;
  const logEntries = actual as LogRecord[];
  let previousEntryIdx = -1;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const index = logEntries.findIndex((item) => item.message.includes(entry));
    if (index === -1) {
      return {
        pass: false,
        message: () => `Entry "${entry}" not found in log file`,
      };
    }
    if (ordered && index < previousEntryIdx) {
      return {
        pass: false,
        message: () => `Entry "${entry}" found but order was not respected`,
      };
    }
    previousEntryIdx = index;
  }
  return {
    pass: true,
    message: () => `All entries found in log file`,
  };
};

expect.extend({
  toContainLogEntry,
  toContainLogEntries,
});

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toContainLogEntry(entry: string): R;

      toContainLogEntries(entries: string[], options?: { ordered?: boolean }): R;
    }
  }
}
