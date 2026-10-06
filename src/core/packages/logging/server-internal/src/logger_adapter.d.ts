import type { LogRecord, Logger, LogMeta, LogLevelId } from '@kbn/logging';
import type { GlobalContext } from './global_context';
/** @internal */
export declare class LoggerAdapter implements Logger {
    private logger;
    private globalContext;
    constructor(logger: Logger, globalContext?: GlobalContext);
    /**
     * The current logger can be updated "on the fly", e.g. when the log config
     * has changed.
     *
     * This is not intended for external use, only internally in Kibana
     *
     * @internal
     */
    updateLogger(logger: Logger): void;
    /**
     * The current record of {@link GlobalContext} that can be updated on the fly.
     * Any updates via this method will be applied to all subsequent log entries.
     *
     * This is not intended for external use, only internally in Kibana
     *
     * @internal
     */
    updateGlobalContext(context: GlobalContext): void;
    trace(message: string, meta?: LogMeta): void;
    debug(message: string, meta?: LogMeta): void;
    info(message: string, meta?: LogMeta): void;
    warn(errorOrMessage: string | Error, meta?: LogMeta): void;
    error(errorOrMessage: string | Error, meta?: LogMeta): void;
    fatal(errorOrMessage: string | Error, meta?: LogMeta): void;
    log(record: LogRecord): void;
    isLevelEnabled(level: LogLevelId): boolean;
    get(...contextParts: string[]): Logger;
}
