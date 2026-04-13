import type { LogRecord } from './log_record';
/**
 * Entity that can format `LogRecord` instance into a string.
 * @internal
 */
export interface Layout {
    format(record: LogRecord): string;
}
