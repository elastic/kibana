import type { LogLevel, LogRecord, LogMeta } from '@kbn/logging';
import { AbstractLogger } from '@kbn/core-logging-common-internal';
export declare const BROWSER_PID = -1;
/** @internal */
export declare class BaseLogger extends AbstractLogger {
    protected createLogRecord<Meta extends LogMeta>(level: LogLevel, errorOrMessage: string | Error, meta?: Meta): LogRecord;
}
