import { Level, LogLevelId } from './Level';
import { Schema, typeOfSchema } from '../types';

const createLoggerSchema = (schema: Schema) => {
  const { object, string, oneOf, literal } = schema;

  return object({
    dest: string({
      defaultValue: 'stdout'
    }),
    level: oneOf(
      [
        literal('fatal'),
        literal('error'),
        literal('warn'),
        literal('info'),
        literal('debug'),
        literal('trace')
      ],
      {
        defaultValue: 'info'
      }
    )
  });
};

const loggingConfigType = typeOfSchema(createLoggerSchema);
type HttpConfigType = typeof loggingConfigType;

export class LoggerConfig {
  /**
   * @internal
   */
  static createSchema = createLoggerSchema;

  readonly dest: string;
  private readonly level: LogLevelId;

  /**
   * @internal
   */
  constructor(config: HttpConfigType) {
    this.dest = config.dest;

    // TODO: To enable more control we could explore the same direction as ES,
    // with something like:
    //
    // ```
    // logging: {
    //   levels: {
    //     "default": "info",
    //     "requests": "error",
    //     "plugin.myPlugin": "trace"
    //   }
    // }
    // ```
    //
    // and then log based on the `namespace`.
    this.level = config.level;
  }

  getLevel(): Level {
    return Level.fromId(this.level);
  }
}
