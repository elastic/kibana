/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { LogRecord } from '@kbn/logging';
import { Conversion } from './types';

// From https://www.ascii-code.com/characters/control-characters,
// but explicitly allowing the range \u0008-\u000F (line breaks, tabs, etc.)
const CONTROL_CHAR_REGEXP = new RegExp('[\\u0000-\\u0007\\u0010-\\u001F]', 'g');

export const MessageConversion: Conversion = {
  pattern: /%message/g,
  convert(record: LogRecord) {
    // Error stack is much more useful than just the message.
    const str = record.error?.stack || record.message;
    // We need to validate it's a string because, despite types, there are use case where it's not a string :/

    return typeof str === 'string'
      ? str.replace(CONTROL_CHAR_REGEXP, (substr) => encodeURI(substr))
      : str;
  },
};
