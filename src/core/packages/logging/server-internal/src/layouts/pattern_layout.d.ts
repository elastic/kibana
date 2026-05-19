import { PatternLayout as BasePatternLayout } from '@kbn/core-logging-common-internal';
export declare const patternSchema: import("@kbn/config-schema").Type<string>;
/**
 * Layout that formats `LogRecord` using the `pattern` string with optional
 * color highlighting (eg. to make log messages easier to read in the terminal).
 * @internal
 */
export declare class PatternLayout extends BasePatternLayout {
    static configSchema: import("@kbn/config-schema").ObjectType<{
        highlight: import("@kbn/config-schema").Type<boolean | undefined>;
        type: import("@kbn/config-schema").Type<"pattern">;
        pattern: import("@kbn/config-schema").Type<string | undefined>;
    }>;
    constructor(pattern?: string, highlight?: boolean);
}
