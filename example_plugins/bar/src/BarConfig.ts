import { schema } from '@elastic/kbn-sdk';

const barConfig = schema.object({
  myValue: schema.string()
});

type BarConfigType = schema.TypeOf<typeof barConfig>;

export class BarConfig {
  /** @internal */
  static schema = barConfig;

  myValue: string;

  /** @internal */
  constructor(config: BarConfigType) {
    this.myValue = config.myValue;
  }
}
