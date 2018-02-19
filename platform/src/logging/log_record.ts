import { LogLevel } from './log_level';

/**
 * Essential parts of every log message.
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
