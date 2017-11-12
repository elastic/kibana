import { Schema, typeOfSchema } from '../types/schema';

export class TestConfig {
  static createSchema = createTestSchema;

  constructor() {
  }
}

function createTestSchema(schema: Schema) {
  return schema.object({
    enabled: schema.boolean({ defaultValue: true }),
  });
}
const testConfigType = typeOfSchema(createTestSchema);

export type TestConfigSchema = typeof testConfigType;
