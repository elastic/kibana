import { Schema, typeOfSchema } from '@elastic/kbn-types';

const createBarConfig = (schema: Schema) =>
  schema.object({
    myValue: schema.string()
  });

const barConfigType = typeOfSchema(createBarConfig);

export class BarConfig {
  /** @internal */
  static createSchema = createBarConfig;

  myValue: string;

  /** @internal */
  constructor(config: typeof barConfigType) {
    this.myValue = config.myValue;
  }
}
