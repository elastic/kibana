import { Schema, typeOfSchema } from 'kbn-types';

const createFooSchema = (schema: Schema) =>
  schema.object({
    encryptionKey: schema.string()
  });

const fooConfigType = typeOfSchema(createFooSchema);

export class FooConfig {
  static createSchema = createFooSchema;

  encryptionKey: string;

  constructor(config: typeof fooConfigType) {
    this.encryptionKey = config.encryptionKey;
  }
}
