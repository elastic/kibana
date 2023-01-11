/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import {
  PatternLayout as BasePatternLayout,
  type Conversion,
} from '@kbn/core-logging-common-internal';
import {
  LoggerConversion,
  LevelConversion,
  MetaConversion,
  MessageConversion,
  PidConversion,
  DateConversion,
} from './conversions';

const DEFAULT_PATTERN = `[%date][%level][%logger] %message`;

export const patternSchema = schema.string({
  validate: (string) => {
    DateConversion.validate!(string);
  },
});

const patternLayoutSchema = schema.object({
  highlight: schema.maybe(schema.boolean()),
  type: schema.literal('pattern'),
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

/**
 * Layout that formats `LogRecord` using the `pattern` string with optional
 * color highlighting (eg. to make log messages easier to read in the terminal).
 * @internal
 */
export class PatternLayout extends BasePatternLayout {
  public static configSchema = patternLayoutSchema;

  constructor(pattern: string = DEFAULT_PATTERN, highlight: boolean = false) {
    super({
      pattern,
      highlight,
      conversions,
    });
  }
}
