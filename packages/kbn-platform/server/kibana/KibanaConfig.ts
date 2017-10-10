import { Schema, typeOfSchema } from '../../types/schema';

const createKibanaSchema = (schema: Schema) =>
  schema.object({
    index: schema.string({ defaultValue: '.kibana' })
  });

const kibanaConfigType = typeOfSchema(createKibanaSchema);
type KibanaConfigType = typeof kibanaConfigType;

export class KibanaConfig {
  /**
   * @internal
   */
  static createSchema = createKibanaSchema;

  readonly index: string;

  /**
   * @internal
   */
  constructor(config: KibanaConfigType) {
    this.index = config.index;
  }
}
