import type { LogRecord } from '@kbn/logging';
export interface Conversion {
    pattern: RegExp;
    convert: (record: LogRecord, highlight: boolean) => string;
    validate?: (input: string) => void;
}
