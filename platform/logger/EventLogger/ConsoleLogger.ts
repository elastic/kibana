import { EventLogger, LogEvent } from './Log';
import { LoggerConfig } from '../LoggerConfig';

export class ConsoleLogger implements EventLogger {
  log(event: LogEvent): void {
    console.log(
      `[${event.level.id}]`,
      `[${event.context.join('.')}]`,
      event.message
    );
  }

  update(config: LoggerConfig): void {
    console.log('update console logger', config);
  }

  close(): void {
    console.log('close console logger');
  }
}