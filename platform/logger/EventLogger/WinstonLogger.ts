import { EventLogger, LogEvent } from './Log';
import { LoggerConfig } from '../LoggerConfig';

// TODO Weeeell, _actually_ use something like Winston :see_no_evil:

export class WinstonLogger implements EventLogger {
  constructor(config: LoggerConfig) {
    console.log('creating winston logger');
  }

  log(event: LogEvent): void {
    console.log(
      `-`,
      `[${event.level.id}]`,
      `[${event.context.join('.')}]`,
      event.message
    );
  }

  update(config: LoggerConfig): void {
    console.log('update winston logger', config);
  }

  close(): void {
    console.log('close winston logger');
  }
}