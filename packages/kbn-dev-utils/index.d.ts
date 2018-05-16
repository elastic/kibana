import { Readable } from 'stream';

type LogLevel = 'silent' | 'error' | 'warning' | 'info' | 'debug' | 'verbose';

export interface IToolingLog extends Readable {
  verbose(...args: any[]): void;
  debug(...args: any[]): void;
  info(...args: any[]): void;
  success(...args: any[]): void;
  warning(...args: any[]): void;
  error(errOrMsg: string | Error): void;
  write(...args: any[]): void;
  indent(spaces: number): void;
  getLevel(): LogLevel;
  setLevel(level: LogLevel): void;
}

export function createToolingLog(level?: LogLevel): IToolingLog;
