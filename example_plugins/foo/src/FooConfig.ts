import { schema } from '@elastic/kbn-utils';

const fooSchema = schema.object({
  encryptionKey: schema.string({ defaultValue: 'default' }),
});

type FooConfigType = schema.TypeOf<typeof fooSchema>;

export class FooConfig {
  static schema = fooSchema;

  encryptionKey: string;

  constructor(config: FooConfigType) {
    this.encryptionKey = config.encryptionKey;
  }
}
