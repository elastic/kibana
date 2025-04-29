/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  PatternLayout as BasePatternLayout,
  type Conversion,
  LoggerConversion,
  LevelConversion,
  MetaConversion,
  MessageConversion,
  DateConversion,
} from '@kbn/core-logging-common-internal';

const DEFAULT_PATTERN = `[%date][%level][%logger] %message`;

const conversions: Conversion[] = [
  LoggerConversion,
  MessageConversion,
  LevelConversion,
  MetaConversion,
  DateConversion,
];

/**
 * Layout that formats `LogRecord` using the `pattern` string with optional
 * color highlighting (eg. to make log messages easier to read in the terminal).
 * @internal
 */
export class PatternLayout extends BasePatternLayout {
  constructor(pattern: string = DEFAULT_PATTERN) {
    super({
      pattern,
      highlight: false,
      conversions,
    });
  }
}
