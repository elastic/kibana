import { Schema, typeOfSchema } from '../../types';

const createKibanaSchema = (schema: Schema) =>
  schema.object({
    index: schema.string({ defaultValue: '.kibana' })
  });

const kibanaConfigType = typeOfSchema(createKibanaSchema);

export class KibanaConfig {
  static createSchema = createKibanaSchema;

  readonly index: string;

  constructor(config: typeof kibanaConfigType) {
    this.index = config.index;
  }
}
