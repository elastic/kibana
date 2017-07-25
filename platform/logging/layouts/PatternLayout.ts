import * as chalk from 'chalk';
import { Schema, typeOfSchema } from '../../types';
import { LogLevel } from '../LogLevel';
import { LogRecord } from '../LogRecord';
import { Layout } from './Layouts';

/**
 * Object that consists of static constants describing supported parameters
 * in the log message pattern.
 */
const Parameters = Object.freeze({
  Timestamp: '{timestamp}',
  Level: '{level}',
  Context: '{context}',
  Message: '{message}'
});

/**
 * Regular expression used to parse log message pattern and fill in placeholders
 * with actual data.
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
  [LogLevel.Trace, chalk.blue]
]);

const createSchema = ({ boolean, literal, object, string }: Schema) => {
  return object({
    kind: literal('pattern'),
    pattern: string({
      defaultValue: `[${Parameters.Timestamp}][${Parameters.Level}][${Parameters.Context}] ${Parameters.Message}`
    }),
    highlight: boolean({ defaultValue: false })
  });
};

const schemaType = typeOfSchema(createSchema);
/** @internal */
export type PatternLayoutConfigType = typeof schemaType;

/**
 * Layout that formats `LogRecord` using the `pattern` string with optional
 * color highlighting.
 * @internal
 */
export class PatternLayout implements Layout {
  static createConfigSchema = createSchema;

  constructor(private readonly config: PatternLayoutConfigType) {}

  /**
   * Formats `LogRecord` into string based on the specified `pattern` and `highlighting` option.
   * @param record Instance of `LogRecord` to format into string.
   */
  format(record: LogRecord): string {
    const formattedRecord = new Map([
      [Parameters.Timestamp, record.timestamp.toISOString()],
      [Parameters.Level, record.level.id.toUpperCase().padEnd(5)],
      [Parameters.Context, record.context],
      [Parameters.Message, record.message]
    ]);

    if (this.config.highlight) {
      PatternLayout.highlightRecord(record, formattedRecord);
    }

    return this.config.pattern.replace(
      PATTERN_REGEX,
      match => formattedRecord.get(match)!
    );
  }

  private static highlightRecord(
    record: LogRecord,
    formattedRecord: Map<string, string>
  ) {
    if (LEVEL_COLORS.has(record.level)) {
      const color = LEVEL_COLORS.get(record.level)!;
      formattedRecord.set(
        Parameters.Level,
        color(formattedRecord.get(Parameters.Level)!)
      );
    }

    formattedRecord.set(
      Parameters.Context,
      chalk.magenta(formattedRecord.get(Parameters.Context)!)
    );
  }
}
