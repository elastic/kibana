import * as schema from '../../../lib/schema';
import { typeOfSchema } from "../../../types";
import { BaseAppender } from './BaseAppender';

export function getRawSchema() {
  return {
    kind: schema.string(),
    pattern: schema.string({ defaultValue: '[{timestamp}][{level}][{context}] {message}'})
  };
}

const schemaType = typeOfSchema(() => schema.object(getRawSchema()));
export type BaseAppenderConfigSchemaType = typeof schemaType;

export class BaseAppenderConfig {
  readonly kind: string;
  readonly pattern: string;

  constructor(schema: BaseAppenderConfigSchemaType) {
    this.kind = schema.kind;
    this.pattern = schema.pattern;
  }

  createAppender(): BaseAppender {
    throw new Error('`BaseAppenderConfig` can not be used to create any types of appenders.');
  }
}
