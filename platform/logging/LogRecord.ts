import { LogLevel } from './LogLevel';

/**
 * Interface describing essential parts of every log message.
 * @internal
 */
export interface LogRecord {
  timestamp: Date;
  level: LogLevel;
  context: string;
  message: string;
  error?: Error;
  meta?: { [name: string]: any };
}
