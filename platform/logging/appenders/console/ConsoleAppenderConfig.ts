import * as schema from '../../../lib/schema';
import { BaseAppenderConfig, getRawSchema as getBaseRawSchema } from '../base/BaseAppenderConfig'
import { typeOfSchema } from '../../../types';
import { ConsoleAppender } from './ConsoleAppender';

function getSchema() {
  return schema.object({
    ...getBaseRawSchema(),
    kind: schema.literal('console')
  });
}

const schemaType = typeOfSchema(getSchema);
type ConsoleAppenderConfigSchemaType = typeof schemaType;

export class ConsoleAppenderConfig extends BaseAppenderConfig {
  constructor(schema: ConsoleAppenderConfigSchemaType) {
    super(schema);
  }

  createAppender(): ConsoleAppender {
    return new ConsoleAppender(this);
  }

  static getSchema() {
    return getSchema();
  }
}
