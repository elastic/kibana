import { Schema, typeOfSchema } from '../../types';

const createKibanaSchema = (schema: Schema) =>
  schema.object({
    index: schema.string({ defaultValue: '.kibana' })
  });

const kibanaConfigType = typeOfSchema(createKibanaSchema);
type KibanaConfigType = typeof kibanaConfigType;

export class KibanaConfig {
  static createSchema = createKibanaSchema;

  readonly index: string;

  constructor(config: KibanaConfigType) {
    this.index = config.index;
  }
}
