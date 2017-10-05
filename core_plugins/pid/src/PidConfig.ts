import { Schema, typeOfSchema } from 'kbn-types';

const createPidSchema = (schema: Schema) =>
  schema.object({
    enabled: schema.boolean({
      defaultValue: true
    }),

    file: schema.string(),

    // whether or not we should fail if pid file already exists
    exclusive: schema.boolean({
      defaultValue: false
    })
  });

const pidConfigType = typeOfSchema(createPidSchema);

export class PidConfig {
  static createSchema = createPidSchema;

  file: string;
  failIfPidFileAlreadyExists: boolean;

  constructor(config: typeof pidConfigType) {
    this.file = config.file;
    this.failIfPidFileAlreadyExists = config.exclusive;
  }
}
