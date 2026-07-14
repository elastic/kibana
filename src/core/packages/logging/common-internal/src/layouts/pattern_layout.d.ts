import type { LogRecord, Layout } from '@kbn/logging';
import type { Conversion } from './conversions';
export interface PatternLayoutOptions {
    pattern?: string;
    highlight?: boolean;
    conversions?: Conversion[];
}
/**
 * Layout that formats `LogRecord` using the `pattern` string with optional
 * color highlighting (eg. to make log messages easier to read in the terminal).
 * @internal
 */
export declare class PatternLayout implements Layout {
    private readonly pattern;
    private readonly highlight;
    private readonly conversions;
    constructor({ pattern, highlight, conversions, }?: PatternLayoutOptions);
    /**
     * Formats `LogRecord` into a string based on the specified `pattern` and `highlighting` options.
     * @param record Instance of `LogRecord` to format into string.
     */
    format(record: LogRecord): string;
}
