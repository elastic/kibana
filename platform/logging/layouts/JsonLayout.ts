import { Schema, typeOfSchema } from '../../types';
import { LogRecord } from '../LogRecord';
import { Layout } from './Layouts';

const createSchema = ({ literal, object }: Schema) => {
  return object({
    kind: literal('json')
  });
};

const schemaType = typeOfSchema(createSchema);
/** @internal */
export type JsonLayoutConfigType = typeof schemaType;

/**
 * Layout that just converts `LogRecord` into JSON string.
 * @internal
 */
export class JsonLayout implements Layout {
  static createConfigSchema = createSchema;

  format({ timestamp, level, context, message, error, meta }: LogRecord): string {
    return JSON.stringify({
      '@timestamp': timestamp.toISOString(),
      level: level.id.toUpperCase(),
      context,
      message,
      error: error && error.message,
      meta
    });
  }
}
