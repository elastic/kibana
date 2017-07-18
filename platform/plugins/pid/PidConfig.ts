import { object, boolean, string, TypeOf } from '../../lib/schema';

const pidSchema = object({
  enabled: boolean({
    defaultValue: true
  }),

  file: string(),

  // whether or not we should fail if pid file already exists
  exclusive: boolean({
    defaultValue: false
  })
});

export class PidConfig {
  static createSchema = () => pidSchema;

  file: string;
  failIfPidFileAlreadyExists: boolean;

  constructor(config: TypeOf<typeof pidSchema>) {
    this.file = config.file;
    this.failIfPidFileAlreadyExists = config.exclusive;
  }
}
