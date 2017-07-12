import { LogLevel } from './LogLevel';

export interface LogRecord {
  timestamp: Date;
  level: LogLevel;
  context: string;
  message: string;
  error?: Error;
  meta?: { [name: string]: any };
}
