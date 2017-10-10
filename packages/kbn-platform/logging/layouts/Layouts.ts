import { assertNever } from '../../lib/utils';
import { Schema } from '../../types/schema';
import { JsonLayout, JsonLayoutConfigType } from './JsonLayout';
import { PatternLayout, PatternLayoutConfigType } from './PatternLayout';
import { LogRecord } from '../LogRecord';

type LayoutConfigType = PatternLayoutConfigType | JsonLayoutConfigType;

/**
 * Entity that can format `LogRecord` instance into a string.
 * @internal
 */
export interface Layout {
  format(record: LogRecord): string;
}

/** @internal */
export class Layouts {
  static createConfigSchema(schema: Schema) {
    const { oneOf } = schema;

    return oneOf([
      JsonLayout.createConfigSchema(schema),
      PatternLayout.createConfigSchema(schema)
    ]);
  }

  /**
   * Factory method that creates specific `Layout` instances based on the passed `config` parameter.
   * @param config Configuration specific to a particular `Layout` implementation.
   * @returns Fully constructed `Layout` instance.
   */
  static create(config: LayoutConfigType): Layout {
    switch (config.kind) {
      case 'json':
        return new JsonLayout();
      case 'pattern':
        return new PatternLayout(config.pattern, config.highlight);
      default:
        return assertNever(config);
    }
  }
}
