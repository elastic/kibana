import { Schema, typeOfSchema } from '@elastic/kbn-types';

const createFooSchema = (schema: Schema) =>
  schema.object({
    encryptionKey: schema.string({ defaultValue: 'default' })
  });

const fooConfigType = typeOfSchema(createFooSchema);

export class FooConfig {
  static createSchema = createFooSchema;

  encryptionKey: string;

  constructor(config: typeof fooConfigType) {
    this.encryptionKey = config.encryptionKey;
  }
}
