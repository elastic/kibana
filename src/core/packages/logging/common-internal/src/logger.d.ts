import type { Appender, LogRecord, LoggerFactory, LogMeta, Logger, LogMessageSource, LogLevelId } from '@kbn/logging';
import { LogLevel } from '@kbn/logging';
/**
 * @internal
 */
export type CreateLogRecordFn = <Meta extends LogMeta>(level: LogLevel, errorOrMessage: string | Error, meta?: Meta) => LogRecord;
/**
 * A basic, abstract logger implementation that delegates the create of log records to the child's createLogRecord function.
 * @internal
 */
export declare abstract class AbstractLogger implements Logger {
    protected readonly context: string;
    protected readonly level: LogLevel;
    protected readonly appenders: Appender[];
    protected readonly factory: LoggerFactory;
    constructor(context: string, level: LogLevel, appenders: Appender[], factory: LoggerFactory);
    protected abstract createLogRecord<Meta extends LogMeta>(level: LogLevel, errorOrMessage: string | Error, meta?: Meta): LogRecord;
    trace<Meta extends LogMeta = LogMeta>(message: LogMessageSource, meta?: Meta): void;
    debug<Meta extends LogMeta = LogMeta>(message: LogMessageSource, meta?: Meta): void;
    info<Meta extends LogMeta = LogMeta>(message: LogMessageSource, meta?: Meta): void;
    warn<Meta extends LogMeta = LogMeta>(errorOrMessage: LogMessageSource | Error, meta?: Meta): void;
    error<Meta extends LogMeta = LogMeta>(errorOrMessage: LogMessageSource | Error, meta?: Meta): void;
    fatal<Meta extends LogMeta = LogMeta>(errorOrMessage: LogMessageSource | Error, meta?: Meta): void;
    isLevelEnabled(levelId: LogLevelId): boolean;
    log(record: LogRecord): void;
    get(...childContextPaths: string[]): Logger;
    private performLog;
}
