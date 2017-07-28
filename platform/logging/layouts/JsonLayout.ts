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

  format(record: LogRecord): string {
    // Per spec `timestamp.toJSON()` uses `timestamp.toISOString()` under the hood.
    // See http://www.ecma-international.org/ecma-262/5.1/#sec-15.9.5.44
    return JSON.stringify({
      ...record,
      error: record.error && record.error.message
    });
  }
}
