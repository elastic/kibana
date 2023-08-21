/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import ansiRegex from 'ansi-regex';
import { LogRecord } from '@kbn/logging';
import { Conversion } from './types';

const ANSI_ESCAPE_CODES_REGEXP = ansiRegex();

export const MessageConversion: Conversion = {
  pattern: /%message/g,
  convert(record: LogRecord) {
    // Error stack is much more useful than just the message.
    const str = (record.error && record.error.stack) || record.message;
    // We can reuse the same global RegExp here because `.replace()` automatically resets the `.lastIndex` of the RegExp.
    return str.replace(ANSI_ESCAPE_CODES_REGEXP, '');
  },
};
