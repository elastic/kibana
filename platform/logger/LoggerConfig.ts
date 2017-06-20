import { Level } from './Level';
import { Schema, typeOfSchema } from '../types';

const createLoggerSchema = (schema: Schema) =>
  schema.object({
    dest: schema.string({
      defaultValue: 'stdout'
    }),
    silent: schema.boolean({
      defaultValue: false
    }),
    quiet: schema.boolean({
      defaultValue: false
    }),
    verbose: schema.boolean({
      defaultValue: false
    })
  });

const loggingConfigType = typeOfSchema(createLoggerSchema);
type HttpConfigType = typeof loggingConfigType;

export class LoggerConfig {
  static createSchema = createLoggerSchema;

  readonly dest: string;
  private readonly silent: boolean;
  private readonly quiet: boolean;
  private readonly verbose: boolean;

  constructor(config: HttpConfigType) {
    this.dest = config.dest;

    // TODO: Feels like we should clean these up and move to
    // specifying a `level` instead.
    // To enable more control it's also possible to do a:
    // ```
    // logging: {
    //   levels: {
    //     "default": "info",
    //     "requests": "error",
    //     "plugin.myPlugin": "trace"
    //   }
    // }
    // ```
    // and then log based on the `namespace`.
    // ^ is what ES does, right?
    this.silent = config.silent;
    this.quiet = config.quiet;
    this.verbose = config.verbose;
  }

  getLevel(): Level {
    return Level.Debug;
  }
}