import type { LogLevel } from './log_level';
import type { LogMeta } from './log_meta';
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
    meta?: LogMeta;
    pid: number;
    spanId?: string;
    traceId?: string;
    transactionId?: string;
}
