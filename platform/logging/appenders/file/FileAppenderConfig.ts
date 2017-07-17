import * as schema from '../../../lib/schema';
import { BaseAppenderConfig, BaseAppenderRawConfigSchema } from '../base/BaseAppenderConfig'
import { FileAppender } from './FileAppender';

export const FileAppenderConfigSchema = schema.object({
  ...BaseAppenderRawConfigSchema,
  kind: schema.literal('file'),
  path: schema.string()
});

export class FileAppenderConfig extends BaseAppenderConfig {
  readonly path: string;

  constructor(schema: schema.TypeOf<typeof FileAppenderConfigSchema>) {
    super(schema);

    this.path = schema.path;
  }

  createAppender(): FileAppender {
    return new FileAppender(this);
  }
}
