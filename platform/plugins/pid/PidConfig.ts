import { Schema, typeOfSchema } from '../../types';

const createPidSchema = (schema: Schema) =>
  schema.object({
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
