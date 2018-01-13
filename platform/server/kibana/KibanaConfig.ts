import { schema } from '@elastic/kbn-sdk';

const kibanaSchema = schema.object({
  index: schema.string({ defaultValue: '.kibana' })
});

type KibanaConfigType = schema.TypeOf<typeof kibanaSchema>;

export class KibanaConfig {
  /**
   * @internal
   */
  static schema = kibanaSchema;

  readonly index: string;

  /**
   * @internal
   */
  constructor(config: KibanaConfigType) {
    this.index = config.index;
  }
}
