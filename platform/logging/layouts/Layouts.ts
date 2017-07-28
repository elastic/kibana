import { Schema } from '../../types';
import { PatternLayout, PatternLayoutConfigType } from './PatternLayout';
import { LogRecord } from '../LogRecord';

type LayoutConfigType = PatternLayoutConfigType;

/** @internal */
export interface Layout {
  format(record: LogRecord): string;
}

/** @internal */
export class Layouts {
  static createConfigSchema(schema: Schema) {
    return PatternLayout.createConfigSchema(schema);
  }

  /**
   * Factory method that creates specific `Layout` instances based on the passed `config` parameter.
   * @param config Configuration specific to a particular `Layout` implementation.
   * @returns Fully constructed `Layout` instance.
   */
  static create(config: LayoutConfigType): Layout {
    return new PatternLayout(config.pattern, config.highlight);
  }
}
