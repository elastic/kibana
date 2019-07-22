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
import chalk from 'chalk';

import { LogLevel } from '../log_level';
import { LogRecord } from '../log_record';
import { Layout } from './layouts';

/**
 * A set of static constants describing supported parameters in the log message pattern.
 */
const Parameters = Object.freeze({
  Context: '{context}',
  Level: '{level}',
  Message: '{message}',
  Timestamp: '{timestamp}',
});

/**
 * Regular expression used to parse log message pattern and fill in placeholders
 * with the actual data.
 */
const PATTERN_REGEX = new RegExp(
  `${Parameters.Timestamp}|${Parameters.Level}|${Parameters.Context}|${Parameters.Message}`,
  'gi'
);

/**
 * Mapping between `LogLevel` and color that is used to highlight `level` part of
 * the log message.
 */
const LEVEL_COLORS = new Map([
  [LogLevel.Fatal, chalk.red],
  [LogLevel.Error, chalk.red],
  [LogLevel.Warn, chalk.yellow],
  [LogLevel.Debug, chalk.green],
  [LogLevel.Trace, chalk.blue],
]);

/**
 * Default pattern used by PatternLayout if it's not overridden in the configuration.
 */
const DEFAULT_PATTERN = `[${Parameters.Timestamp}][${Parameters.Level}][${Parameters.Context}] ${Parameters.Message}`;

const patternLayoutSchema = schema.object({
  highlight: schema.maybe(schema.boolean()),
  kind: schema.literal('pattern'),
  pattern: schema.maybe(schema.string()),
});

/** @internal */
export type PatternLayoutConfigType = TypeOf<typeof patternLayoutSchema>;

/**
 * Layout that formats `LogRecord` using the `pattern` string with optional
 * color highlighting (eg. to make log messages easier to read in the terminal).
 * @internal
 */
export class PatternLayout implements Layout {
  public static configSchema = patternLayoutSchema;

  private static highlightRecord(record: LogRecord, formattedRecord: Map<string, string>) {
    if (LEVEL_COLORS.has(record.level)) {
      const color = LEVEL_COLORS.get(record.level)!;
      formattedRecord.set(Parameters.Level, color(formattedRecord.get(Parameters.Level)!));
    }

    formattedRecord.set(
      Parameters.Context,
      chalk.magenta(formattedRecord.get(Parameters.Context)!)
    );
  }

  constructor(private readonly pattern = DEFAULT_PATTERN, private readonly highlight = false) {}

  /**
   * Formats `LogRecord` into a string based on the specified `pattern` and `highlighting` options.
   * @param record Instance of `LogRecord` to format into string.
   */
  public format(record: LogRecord): string {
    // Error stack is much more useful than just the message.
    const message = (record.error && record.error.stack) || record.message;
    const formattedRecord = new Map([
      [Parameters.Timestamp, record.timestamp.toISOString()],
      [Parameters.Level, record.level.id.toUpperCase().padEnd(5)],
      [Parameters.Context, record.context],
      [Parameters.Message, message],
    ]);

    if (this.highlight) {
      PatternLayout.highlightRecord(record, formattedRecord);
    }

    return this.pattern.replace(PATTERN_REGEX, match => formattedRecord.get(match)!);
  }
}
