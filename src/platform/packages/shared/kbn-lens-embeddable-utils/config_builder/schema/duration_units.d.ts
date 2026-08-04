import { type Type } from '@kbn/config-schema';
declare const DURATION_INPUT_UNITS: readonly ["ps", "ns", "us", "ms", "s", "min", "h", "d", "w", "mo", "y"];
declare const DURATION_OUTPUT_UNITS: readonly ["auto", "auto-approximate", "ms", "s", "min", "h", "d", "w", "mo", "y"];
export type DurationInputUnit = (typeof DURATION_INPUT_UNITS)[number];
export type DurationOutputUnit = (typeof DURATION_OUTPUT_UNITS)[number];
interface Options<T extends string> {
    defaultValue?: T;
    meta?: {
        description: string;
    };
}
export declare const durationInputUnitSchema: (opts?: Options<DurationInputUnit>) => Type<"min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps">;
export declare const durationOutputUnitSchema: (opts?: Options<DurationOutputUnit>) => Type<"min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate">;
export declare const durationFormatSchema: import("@kbn/config-schema").ObjectType<{
    type: Type<"duration">;
    from: Type<"min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps">;
    to: Type<"min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate">;
    suffix: Type<string | undefined>;
}>;
/**
 * Legacy duration format schema accepting pre-GA free-form string values for `to` and `from`.
 * Used as a fallback when `asCode.useGASchemas` is disabled.
 * @see AS_CODE_USE_GA_SCHEMAS_FEATURE_FLAG
 */
export declare const legacyDurationFormatSchema: import("@kbn/config-schema").ObjectType<{
    type: Type<"duration">;
    /**
     * Unit of the original field value
     * (i.e. 'picoseconds', 'nanoseconds', 'microseconds', 'milliseconds', 'seconds', 'minutes', 'hours', 'days', 'weeks', 'months', 'years')
     */
    from: Type<string>;
    /**
     * Unit of the formatted value
     * (i.e. 'humanize', 'humanizePrecise', 'asMilliseconds', 'asSeconds', 'asMinutes', 'asHours', 'asDays', 'asWeeks', 'asMonths', 'asYears')
     */
    to: Type<string>;
    suffix: Type<string | undefined>;
}>;
export {};
