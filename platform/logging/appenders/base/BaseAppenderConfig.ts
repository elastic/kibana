import * as schema from '../../../lib/schema';
import { BaseAppender } from './BaseAppender';

export const BaseAppenderRawConfigSchema = {
  kind: schema.string(),
  pattern: schema.string({ defaultValue: '[{timestamp}][{level}][{context}] {message}'})
};
export const BaseAppenderConfigSchema = schema.object(BaseAppenderRawConfigSchema);

export class BaseAppenderConfig {
  readonly kind: string;
  readonly pattern: string;

  constructor(schema: schema.TypeOf<typeof BaseAppenderConfigSchema>) {
    this.kind = schema.kind;
    this.pattern = schema.pattern;
  }

  createAppender(): BaseAppender {
    throw new Error('`BaseAppenderConfig` can not be used to create any types of appenders.');
  }
}
