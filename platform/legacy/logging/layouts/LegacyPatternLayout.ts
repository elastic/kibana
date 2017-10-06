import * as chalk from 'chalk';
import { utc } from 'moment';
import { Schema, typeOfSchema } from '../../../types/schema';
import { LogLevel } from '../../../logging/LogLevel';
import { LogRecord } from '../../../logging/LogRecord';
import { Layout } from '../../../logging/layouts/Layouts';

/**
 * A set of static constants describing supported parameters in the log message pattern.
 */
const Parameters = Object.freeze({
  Timestamp: '{timestamp}',
  Level: '{level}',
  Context: '{context}',
  Message: '{message}'
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
  [LogLevel.Fatal, chalk.magenta],
  [LogLevel.Error, chalk.red],
  [LogLevel.Warn, chalk.red],
  [LogLevel.Info, chalk.green],
  [LogLevel.Debug, chalk.gray],
  [LogLevel.Trace, chalk.gray]
]);

/**
 * Default pattern used by PatternLayout if it's not overridden in the configuration.
 */
const DEFAULT_PATTERN =
  `${chalk.gray('server')}    ${chalk.blue('log')}   ` +
  `[${Parameters.Timestamp}] [${Parameters.Level}][${Parameters.Context}] ${Parameters.Message}`;

const createSchema = ({ literal, object }: Schema) => {
  return object({ kind: literal('legacy-pattern') });
};

const schemaType = typeOfSchema(createSchema);
/** @internal */
export type LegacyPatternLayoutConfigType = typeof schemaType;

/**
 * Layout that formats `LogRecord` using the `pattern` string with optional
 * color highlighting (eg. to make log messages easier to read in the terminal).
 * @internal
 */
export class LegacyPatternLayout implements Layout {
  static createConfigSchema = createSchema;

  /**
   * Formats `LogRecord` into a string based on the specified `pattern` and `highlighting` options.
   * @param record Instance of `LogRecord` to format into string.
   */
  format(record: LogRecord): string {
    // Error stack is much more useful than just the message.
    const message = (record.error && record.error.stack) || record.message;
    const formattedRecord = new Map([
      [Parameters.Timestamp, utc(record.timestamp).format('HH:mm:ss.SSS')],
      [Parameters.Level, record.level.id.toLowerCase()],
      [Parameters.Context, record.context.replace(/\./gi, '][')],
      [Parameters.Message, message]
    ]);

    if (LEVEL_COLORS.has(record.level)) {
      const color = LEVEL_COLORS.get(record.level)!;
      formattedRecord.set(
        Parameters.Level,
        color(formattedRecord.get(Parameters.Level)!)
      );
    }

    return DEFAULT_PATTERN.replace(
      PATTERN_REGEX,
      match => formattedRecord.get(match)!
    );
  }
}
