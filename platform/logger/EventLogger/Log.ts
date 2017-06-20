import { Level } from '../Level';
import { LoggerConfig } from '../LoggerConfig';

export interface LogEvent {
  error?: Error,
  timestamp: string,
  level: Level,
  context: string[],
  message: string,
  meta?: { [name: string]: any }
}

export interface EventLogger {
  log(event: LogEvent): void;
  update(config: LoggerConfig): void;
  close(): void;
}
