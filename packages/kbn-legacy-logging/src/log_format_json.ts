/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

// @ts-expect-error missing type def
import stringify from 'json-stringify-safe';
import { BaseLogFormat } from './log_format';

const stripColors = function (string: string) {
  return string.replace(/\u001b[^m]+m/g, '');
};

export class KbnLoggerJsonFormat extends BaseLogFormat {
  format(data: Record<string, any>) {
    data.message = stripColors(data.message);
    data['@timestamp'] = this.extractAndFormatTimestamp(data);
    return stringify(data);
  }
}
