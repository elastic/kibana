import type { Logger, LogMeta } from '@kbn/logging';
import type { SavedObjectsMigrationLogger } from '@kbn/core-saved-objects-server';
export type LogFn = (path: string[], message: string) => void;
export declare class MigrationLogger implements SavedObjectsMigrationLogger {
    private logger;
    constructor(log: Logger);
    info: (msg: string) => void;
    debug: (msg: string) => void;
    warn: (msg: string) => void;
    error: (msg: string, meta: LogMeta) => void;
}
