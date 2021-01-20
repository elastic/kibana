/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { LogRecord } from './log_record';

/**
 * Entity that can format `LogRecord` instance into a string.
 * @internal
 */
export interface Layout {
  format(record: LogRecord): string;
}
