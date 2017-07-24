import { Schema, typeOfSchema } from '../../types';
import { LogLevel } from '../LogLevel';
import { LogRecord } from '../LogRecord';
import { Layout } from './Layouts';

/**
 * Class that consists of static constants describing supported parameters
 * in the log message pattern.
 */
const Parameters = Object.freeze({
  Timestamp: '{timestamp}',
  Level: '{level}',
  Context: '{context}',
  Message: '{message}'
});

/**
 * Class that consists of static constants describing possible colors that can
 * be used for highlighting of log message parts.
 */
const HighlightColor = Object.freeze({
  Red: 31,
  Green: 32,
  Yellow: 33,
  Blue: 34,
  Magenta: 35
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
  [LogLevel.Fatal, HighlightColor.Red],
  [LogLevel.Error, HighlightColor.Red],
  [LogLevel.Warn, HighlightColor.Yellow],
  [LogLevel.Debug, HighlightColor.Green],
  [LogLevel.Trace, HighlightColor.Blue]
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
      formattedRecord.set(
        Parameters.Level,
        `\x1b[${LEVEL_COLORS.get(record.level)}m${formattedRecord.get(
          Parameters.Level
        )}\x1b[0m`
      );
    }

    formattedRecord.set(
      Parameters.Context,
      `\x1b[${HighlightColor.Magenta}m${formattedRecord.get(
        Parameters.Context
      )}\x1b[0m`
    );
  }
}
