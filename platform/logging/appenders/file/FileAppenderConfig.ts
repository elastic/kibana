import * as schema from '../../../lib/schema';
import { BaseAppenderConfig, getRawSchema as getBaseRawSchema } from '../base/BaseAppenderConfig'
import { typeOfSchema } from '../../../types';
import { FileAppender } from './FileAppender';

function getSchema() {
  return schema.object({
    ...getBaseRawSchema(),
    kind: schema.literal('file'),
    path: schema.string()
  });
}

const schemaType = typeOfSchema(getSchema);
type FileAppenderConfigSchemaType = typeof schemaType;

export class FileAppenderConfig extends BaseAppenderConfig {
  readonly path: string;

  constructor(schema: FileAppenderConfigSchemaType) {
    super(schema);

    this.path = schema.path;
  }

  createAppender(): FileAppender {
    return new FileAppender(this);
  }

  static getSchema() {
    return getSchema();
  }
}
