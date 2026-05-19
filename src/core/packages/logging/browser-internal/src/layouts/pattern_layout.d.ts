import { PatternLayout as BasePatternLayout } from '@kbn/core-logging-common-internal';
/**
 * Layout that formats `LogRecord` using the `pattern` string with optional
 * color highlighting (eg. to make log messages easier to read in the terminal).
 * @internal
 */
export declare class PatternLayout extends BasePatternLayout {
    constructor(pattern?: string);
}
