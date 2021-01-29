/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { LogRecord } from '@kbn/logging';
import { Conversion } from './type';

export const MessageConversion: Conversion = {
  pattern: /%message/g,
  convert(record: LogRecord) {
    // Error stack is much more useful than just the message.
    return (record.error && record.error.stack) || record.message;
  },
};
