import * as schema from '../../../lib/schema';
import { BaseAppenderConfig, BaseAppenderRawConfigSchema } from '../base/BaseAppenderConfig'
import { ConsoleAppender } from './ConsoleAppender';

export const ConsoleAppenderConfigSchema = schema.object({
  ...BaseAppenderRawConfigSchema,
  kind: schema.literal('console')
});

export class ConsoleAppenderConfig extends BaseAppenderConfig {
  constructor(schema: schema.TypeOf<typeof ConsoleAppenderConfigSchema>) {
    super(schema);
  }

  createAppender(): ConsoleAppender {
    return new ConsoleAppender(this);
  }
}
