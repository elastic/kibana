import { Schema } from '../../types';
import { PatternLayout, PatternLayoutConfigType } from './PatternLayout';
import { LogRecord } from '../LogRecord';

export type LayoutConfigType = PatternLayoutConfigType;

export interface Layout {
  format(record: LogRecord): string;
}

export class Layouts {
  /**
   * @internal
   */
  static createConfigSchema(schema: Schema) {
    return PatternLayout.createConfigSchema(schema);
  }

  /**
   * Factory method that creates specific `Layout` instances based on the passed `config` parameter.
   * @param config Configuration specific to a particular `Layout` implementation.
   * @returns Fully constructed `Layout` instance.
   */
  static create(config: LayoutConfigType): Layout {
    return new PatternLayout(config);
  }
}
