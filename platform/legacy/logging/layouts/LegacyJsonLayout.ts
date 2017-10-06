import { utc } from 'moment';
import { Schema, typeOfSchema } from '../../../types/schema';
import { LogRecord } from '../../../logging/LogRecord';
import { Layout } from '../../../logging/layouts/Layouts';

const createSchema = ({ literal, object }: Schema) => {
  return object({
    kind: literal('legacy-json')
  });
};

const schemaType = typeOfSchema(createSchema);
/** @internal */
export type LegacyJsonLayoutConfigType = typeof schemaType;

/**
 * Layout that just converts `LogRecord` into JSON string in the same
 * format as used by the legacy platform.
 * @internal
 */
export class LegacyJsonLayout implements Layout {
  static createConfigSchema = createSchema;

  format(record: LogRecord): string {
    const recordToSerialize: { [key: string]: any } = {
      type: 'log',
      '@timestamp': utc(record.timestamp).format(),
      tags: [record.level.id.toLowerCase(), ...record.context.split('.')],
      pid: process.pid,
      message: record.message
    };

    if (record.error !== undefined) {
      recordToSerialize.level = record.level.id.toLowerCase();
      recordToSerialize.error = {
        message: record.error.message,
        name: record.error.name,
        stack: record.error.stack
      };
    }

    return JSON.stringify(recordToSerialize);
  }
}
