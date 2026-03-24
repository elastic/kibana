/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LogRecord } from '@kbn/logging';
import type { Conversion } from './types';

function isError(x: any): x is Error {
  return x instanceof Error;
}

export const ErrorConversion: Conversion = {
  pattern: /%error/g,
  convert(record: LogRecord) {
    let error;
    if (isError(record.meta?.error)) {
      error = record.meta?.error.stack;
    }
    return error ? `${error}` : '';
  },
};
