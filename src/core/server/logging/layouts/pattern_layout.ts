/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { LogRecord, Layout } from '@kbn/logging';

import {
  Conversion,
  LoggerConversion,
  LevelConversion,
  MetaConversion,
  MessageConversion,
  PidConversion,
  DateConversion,
} from './conversions';

/**
 * Default pattern used by PatternLayout if it's not overridden in the configuration.
 */
const DEFAULT_PATTERN = `[%date][%level][%logger]%meta %message`;

export const patternSchema = schema.string({
  validate: (string) => {
    DateConversion.validate!(string);
  },
});

const patternLayoutSchema = schema.object({
  highlight: schema.maybe(schema.boolean()),
  kind: schema.literal('pattern'),
  pattern: schema.maybe(patternSchema),
});

const conversions: Conversion[] = [
  LoggerConversion,
  MessageConversion,
  LevelConversion,
  MetaConversion,
  PidConversion,
  DateConversion,
];

/** @internal */
export interface PatternLayoutConfigType {
  kind: 'pattern';
  highlight?: boolean;
  pattern?: string;
}

/**
 * Layout that formats `LogRecord` using the `pattern` string with optional
 * color highlighting (eg. to make log messages easier to read in the terminal).
 * @internal
 */
export class PatternLayout implements Layout {
  public static configSchema = patternLayoutSchema;
  constructor(private readonly pattern = DEFAULT_PATTERN, private readonly highlight = false) {}

  /**
   * Formats `LogRecord` into a string based on the specified `pattern` and `highlighting` options.
   * @param record Instance of `LogRecord` to format into string.
   */
  public format(record: LogRecord): string {
    let recordString = this.pattern;
    for (const conversion of conversions) {
      recordString = recordString.replace(
        conversion.pattern,
        conversion.convert.bind(null, record, this.highlight)
      );
    }

    return recordString;
  }
}
