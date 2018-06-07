import { Readable } from 'stream';

type LogLevel = 'silent' | 'error' | 'warning' | 'info' | 'debug' | 'verbose';

export class ToolingLog extends Readable {
  public verbose(...args: any[]): void;
  public debug(...args: any[]): void;
  public info(...args: any[]): void;
  public success(...args: any[]): void;
  public warning(...args: any[]): void;
  public error(errOrMsg: string | Error): void;
  public write(...args: any[]): void;
  public indent(spaces: number): void;
  public getLevel(): LogLevel;
  public setLevel(level: LogLevel): void;
}

export function createToolingLog(level?: LogLevel): ToolingLog;
