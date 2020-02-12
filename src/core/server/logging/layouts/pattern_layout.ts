/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { schema, TypeOf } from '@kbn/config-schema';

import { LogRecord } from '../log_record';
import { Layout } from './layouts';

import { Conversion } from './conversions/type';
import { ContextConversion } from './conversions/context';
import { LevelConversion } from './conversions/level';
import { MetaConversion } from './conversions/meta';
import { MessageConversion } from './conversions/message';
import { PidConversion } from './conversions/pid';
import { TimestampConversion } from './conversions/timestamp';

/**
 * Default pattern used by PatternLayout if it's not overridden in the configuration.
 */
const DEFAULT_PATTERN = `[{timestamp}][{level}][{context}]{meta} {message}`;

export const patternSchema = schema.string({
  validate: string => {
    TimestampConversion.validate!(string);
  },
});

const patternLayoutSchema = schema.object({
  highlight: schema.maybe(schema.boolean()),
  kind: schema.literal('pattern'),
  pattern: schema.maybe(patternSchema),
});

const conversions: Conversion[] = [
  ContextConversion,
  MessageConversion,
  LevelConversion,
  MetaConversion,
  PidConversion,
  TimestampConversion,
];

/** @internal */
export type PatternLayoutConfigType = TypeOf<typeof patternLayoutSchema>;

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
        conversion.formatter.bind(null, record, this.highlight)
      );
    }

    return recordString;
  }
}
