import { Level, LogLevelId } from './Level';
import { object, string, oneOf, literal, TypeOf } from '../lib/schema';

const loggerSchema = object({
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

export class LoggerConfig {
  static createSchema = () => loggerSchema;

  readonly dest: string;
  private readonly level: LogLevelId;

  constructor(config: TypeOf<typeof loggerSchema>) {
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
