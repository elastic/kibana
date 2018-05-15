import { schema } from '../../config/schema';

import { assertNever } from '../../../utils';
import { JsonLayout, JsonLayoutConfigType } from './json_layout';
import { PatternLayout, PatternLayoutConfigType } from './pattern_layout';
import { LogRecord } from '../log_record';

const { oneOf } = schema;

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
  static configSchema = oneOf([
    JsonLayout.configSchema,
    PatternLayout.configSchema,
  ]);

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
