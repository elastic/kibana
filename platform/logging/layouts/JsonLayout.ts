import { Schema, typeOfSchema } from '../../types/schema';
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

  format(record: LogRecord): string {
    return JSON.stringify({
      '@timestamp': record.timestamp.toISOString(),
      level: record.level.id.toUpperCase(),
      context: record.context,
      message: record.message,
      error: JsonLayout.errorToSerializableObject(record.error),
      meta: record.meta
    });
  }

  private static errorToSerializableObject(error: Error | undefined) {
    if (error === undefined) {
      return error;
    }

    return {
      name: error.name,
      stack: error.stack,
      message: error.message
    };
  }
}
