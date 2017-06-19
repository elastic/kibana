import { Duration } from 'moment';

import { Schema, typeOfSchema } from '../../types';

const createXPackConfig = (schema: Schema) =>
  schema.object({
    enabled: schema.boolean({
      defaultValue: true
    }),
    xpack_api_polling_frequency_millis: schema.duration({
      defaultValue: '30001ms'
    })
  });

const xpackConfigType = typeOfSchema(createXPackConfig);

export class XPackConfig {
  static createSchema = createXPackConfig;

  enabled: boolean;
  pollingFrequencyInMillis: Duration;

  constructor(config: typeof xpackConfigType) {
    this.enabled = config.enabled;
    this.pollingFrequencyInMillis = config.xpack_api_polling_frequency_millis;
  }
}
