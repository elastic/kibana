/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { LogRecord, Layout } from '@kbn/logging';
import {
  Conversion,
  LoggerConversion,
  LevelConversion,
  MetaConversion,
  MessageConversion,
  DateConversion,
} from './conversions';

/**
 * Default pattern used by PatternLayout if it's not overridden in the configuration.
 */
const DEFAULT_PATTERN = `[%date][%level][%logger] %message`;

const DEFAULT_CONVERSIONS: Conversion[] = [
  LoggerConversion,
  MessageConversion,
  LevelConversion,
  MetaConversion,
  DateConversion,
];

export interface PatternLayoutOptions {
  pattern?: string;
  highlight?: boolean;
  conversions?: Conversion[];
}

/**
 * Layout that formats `LogRecord` using the `pattern` string with optional
 * color highlighting (eg. to make log messages easier to read in the terminal).
 * @internal
 */
export class PatternLayout implements Layout {
  private readonly pattern: string;
  private readonly highlight: boolean;
  private readonly conversions: Conversion[];

  constructor({
    pattern = DEFAULT_PATTERN,
    highlight = false,
    conversions = DEFAULT_CONVERSIONS,
  }: PatternLayoutOptions = {}) {
    this.pattern = pattern;
    this.highlight = highlight;
    this.conversions = conversions;
  }

  /**
   * Formats `LogRecord` into a string based on the specified `pattern` and `highlighting` options.
   * @param record Instance of `LogRecord` to format into string.
   */
  public format(record: LogRecord): string {
    let recordString = this.pattern;
    for (const conversion of this.conversions) {
      recordString = recordString.replace(
        conversion.pattern,
        conversion.convert.bind(null, record, this.highlight)
      );
    }

    return recordString;
  }
}
