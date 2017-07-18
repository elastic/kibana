import { object, string, TypeOf } from '../../lib/schema';

const kibanaSchema = object({
  index: string({ defaultValue: '.kibana' })
});

export class KibanaConfig {
  static createSchema = () => kibanaSchema;

  readonly index: string;

  constructor(config: TypeOf<typeof kibanaSchema>) {
    this.index = config.index;
  }
}
