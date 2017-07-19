import { Duration } from 'moment';
import { Schema, typeOfSchema } from 'kbn-types';

const createXPackConfig = (schema: Schema) =>
  schema.object({
    enabled: schema.boolean({
      defaultValue: true
    }),
    api_polling_frequency: schema.duration({
      defaultValue: '30001ms'
    })
  });

const xpackConfigType = typeOfSchema(createXPackConfig);
type XPackConfigType = typeof xpackConfigType;

export class XPackConfig {
  static createSchema = createXPackConfig;

  enabled: boolean;
  pollingFrequency: Duration;

  constructor(config: XPackConfigType) {
    this.enabled = config.enabled;
    this.pollingFrequency = config.api_polling_frequency;
  }
}
