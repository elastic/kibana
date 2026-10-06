/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PatternLayout as BasePatternLayout } from '@kbn/core-logging-common-internal';
export declare const patternSchema: import('@kbn/config-schema').Type<string>;
/**
 * Layout that formats `LogRecord` using the `pattern` string with optional
 * color highlighting (eg. to make log messages easier to read in the terminal).
 * @internal
 */
export declare class PatternLayout extends BasePatternLayout {
  static configSchema: import('@kbn/config-schema').ObjectType<{
    highlight: import('@kbn/config-schema').Type<boolean | undefined>;
    type: import('@kbn/config-schema').Type<'pattern'>;
    pattern: import('@kbn/config-schema').Type<string | undefined>;
  }>;
  constructor(pattern?: string, highlight?: boolean);
}
