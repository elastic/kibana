import type { TypeOf } from '@kbn/config-schema';
import { type Props } from '@kbn/config-schema';
export declare const baseLegendVisibilitySchema: import("@kbn/config-schema").Type<"hidden" | "visible" | undefined>;
export declare const legendVisibilitySchemaWithAuto: import("@kbn/config-schema").Type<"auto" | "hidden" | "visible" | undefined>;
export declare const legendSizeSchema: import("@kbn/config-schema").Type<"m" | "s" | "auto" | "l" | "xl" | undefined>;
/**
 * Best to not use dynamic schema building logic
 * so the possible combinations are declared here explicitly:
 * - metric without ref based ops (eh. gauge/any chart that cannot have a date histogram)
 * - the previous + ref based ops (eh. line chart with date histogram)
 * - the previous + static op (i.e. reference line or gauge min/max/etc...)
 * - bucket operations
 */
export declare function mergeAllMetricsWithChartDimensionSchema<T extends Props>(baseSchema: T, context: string): import("@kbn/config-schema").Type<Readonly<{ [K_1 in keyof ((Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "field" | "operation"> & {
    field: import("@kbn/config-schema").Type<string | undefined>;
    operation: import("@kbn/config-schema").Type<"count">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_3 extends keyof T ? { [P_1 in T_3]: T[P_1]; } : never)]: T[K]; } extends infer T_2 extends Props ? { [Key in keyof T_2]: undefined extends TypeOf<T_2[Key]> ? Key : never; } : never)[Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"field", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T> | Exclude<"time_shift", keyof T> | Exclude<"empty_as_null", keyof T> | { [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T]] extends infer T_1 extends keyof (Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "field" | "operation"> & {
    field: import("@kbn/config-schema").Type<string | undefined>;
    operation: import("@kbn/config-schema").Type<"count">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_4 extends keyof T ? { [P_1 in T_4]: T[P_1]; } : never)]: T[K]; }) ? { [P in T_1]: (Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "field" | "operation"> & {
    field: import("@kbn/config-schema").Type<string | undefined>;
    operation: import("@kbn/config-schema").Type<"count">;
}, keyof T> & { [K in keyof ({ [Key in keyof T]: undefined extends T[Key] ? never : null extends T[Key] ? never : Key; }[keyof T] extends infer T_2 extends keyof T ? { [P_2 in T_2]: T[P_2]; } : never)]: T[K]; })[P]; } : never)]?: TypeOf<(Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "field" | "operation"> & {
    field: import("@kbn/config-schema").Type<string | undefined>;
    operation: import("@kbn/config-schema").Type<"count">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_5 extends keyof T ? { [P_1 in T_5]: T[P_1]; } : never)]: T[K]; })[K_1]> | undefined; } & { [K_2 in keyof ((Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "field" | "operation"> & {
    field: import("@kbn/config-schema").Type<string | undefined>;
    operation: import("@kbn/config-schema").Type<"count">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_7 extends keyof T ? { [P_1 in T_7]: T[P_1]; } : never)]: T[K]; } extends infer T_6 extends Props ? { [Key_2 in keyof T_6]: undefined extends TypeOf<T_6[Key_2]> ? never : Key_2; } : never)[Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"field", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T> | Exclude<"time_shift", keyof T> | Exclude<"empty_as_null", keyof T> | { [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T]] extends infer T_5 extends keyof (Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "field" | "operation"> & {
    field: import("@kbn/config-schema").Type<string | undefined>;
    operation: import("@kbn/config-schema").Type<"count">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_8 extends keyof T ? { [P_1 in T_8]: T[P_1]; } : never)]: T[K]; }) ? { [P_2 in T_5]: (Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "field" | "operation"> & {
    field: import("@kbn/config-schema").Type<string | undefined>;
    operation: import("@kbn/config-schema").Type<"count">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_6 extends keyof T ? { [P_1 in T_6]: T[P_1]; } : never)]: T[K]; })[P_2]; } : never)]: TypeOf<(Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "field" | "operation"> & {
    field: import("@kbn/config-schema").Type<string | undefined>;
    operation: import("@kbn/config-schema").Type<"count">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_9 extends keyof T ? { [P_1 in T_9]: T[P_1]; } : never)]: T[K]; })[K_2]>; }> | Readonly<{ [K_3 in keyof ((Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"unique_count">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_11 extends keyof T ? { [P_1 in T_11]: T[P_1]; } : never)]: T[K]; } extends infer T_10 extends Props ? { [Key_3 in keyof T_10]: undefined extends TypeOf<T_10[Key_3]> ? Key_3 : never; } : never)[Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"field", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T> | Exclude<"time_shift", keyof T> | Exclude<"empty_as_null", keyof T> | { [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T]] extends infer T_9 extends keyof (Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"unique_count">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_12 extends keyof T ? { [P_1 in T_12]: T[P_1]; } : never)]: T[K]; }) ? { [P_3 in T_9]: (Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"unique_count">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_10 extends keyof T ? { [P_1 in T_10]: T[P_1]; } : never)]: T[K]; })[P_3]; } : never)]?: TypeOf<(Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"unique_count">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_13 extends keyof T ? { [P_1 in T_13]: T[P_1]; } : never)]: T[K]; })[K_3]> | undefined; } & { [K_4 in keyof ((Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"unique_count">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_15 extends keyof T ? { [P_1 in T_15]: T[P_1]; } : never)]: T[K]; } extends infer T_14 extends Props ? { [Key_4 in keyof T_14]: undefined extends TypeOf<T_14[Key_4]> ? never : Key_4; } : never)[Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"field", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T> | Exclude<"time_shift", keyof T> | Exclude<"empty_as_null", keyof T> | { [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T]] extends infer T_13 extends keyof (Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"unique_count">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_16 extends keyof T ? { [P_1 in T_16]: T[P_1]; } : never)]: T[K]; }) ? { [P_4 in T_13]: (Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"unique_count">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_14 extends keyof T ? { [P_1 in T_14]: T[P_1]; } : never)]: T[K]; })[P_4]; } : never)]: TypeOf<(Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"unique_count">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_17 extends keyof T ? { [P_1 in T_17]: T[P_1]; } : never)]: T[K]; })[K_4]>; }> | Readonly<{ [K_5 in keyof ((Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"min" | "max" | "average" | "median" | "standard_deviation">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_19 extends keyof T ? { [P_1 in T_19]: T[P_1]; } : never)]: T[K]; } extends infer T_18 extends Props ? { [Key_5 in keyof T_18]: undefined extends TypeOf<T_18[Key_5]> ? Key_5 : never; } : never)[Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"field", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T> | Exclude<"time_shift", keyof T> | { [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T]] extends infer T_17 extends keyof (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"min" | "max" | "average" | "median" | "standard_deviation">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_20 extends keyof T ? { [P_1 in T_20]: T[P_1]; } : never)]: T[K]; }) ? { [P_5 in T_17]: (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"min" | "max" | "average" | "median" | "standard_deviation">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_18 extends keyof T ? { [P_1 in T_18]: T[P_1]; } : never)]: T[K]; })[P_5]; } : never)]?: TypeOf<(Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"min" | "max" | "average" | "median" | "standard_deviation">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_21 extends keyof T ? { [P_1 in T_21]: T[P_1]; } : never)]: T[K]; })[K_5]> | undefined; } & { [K_6 in keyof ((Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"min" | "max" | "average" | "median" | "standard_deviation">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_23 extends keyof T ? { [P_1 in T_23]: T[P_1]; } : never)]: T[K]; } extends infer T_22 extends Props ? { [Key_6 in keyof T_22]: undefined extends TypeOf<T_22[Key_6]> ? never : Key_6; } : never)[Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"field", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T> | Exclude<"time_shift", keyof T> | { [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T]] extends infer T_21 extends keyof (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"min" | "max" | "average" | "median" | "standard_deviation">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_24 extends keyof T ? { [P_1 in T_24]: T[P_1]; } : never)]: T[K]; }) ? { [P_6 in T_21]: (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"min" | "max" | "average" | "median" | "standard_deviation">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_22 extends keyof T ? { [P_1 in T_22]: T[P_1]; } : never)]: T[K]; })[P_6]; } : never)]: TypeOf<(Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"min" | "max" | "average" | "median" | "standard_deviation">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_25 extends keyof T ? { [P_1 in T_25]: T[P_1]; } : never)]: T[K]; })[K_6]>; }> | Readonly<{ [K_7 in keyof ((Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"sum">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_27 extends keyof T ? { [P_1 in T_27]: T[P_1]; } : never)]: T[K]; } extends infer T_26 extends Props ? { [Key_7 in keyof T_26]: undefined extends TypeOf<T_26[Key_7]> ? Key_7 : never; } : never)[Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"field", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T> | Exclude<"time_shift", keyof T> | Exclude<"empty_as_null", keyof T> | { [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T]] extends infer T_25 extends keyof (Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"sum">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_28 extends keyof T ? { [P_1 in T_28]: T[P_1]; } : never)]: T[K]; }) ? { [P_7 in T_25]: (Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"sum">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_26 extends keyof T ? { [P_1 in T_26]: T[P_1]; } : never)]: T[K]; })[P_7]; } : never)]?: TypeOf<(Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"sum">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_29 extends keyof T ? { [P_1 in T_29]: T[P_1]; } : never)]: T[K]; })[K_7]> | undefined; } & { [K_8 in keyof ((Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"sum">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_31 extends keyof T ? { [P_1 in T_31]: T[P_1]; } : never)]: T[K]; } extends infer T_30 extends Props ? { [Key_8 in keyof T_30]: undefined extends TypeOf<T_30[Key_8]> ? never : Key_8; } : never)[Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"field", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T> | Exclude<"time_shift", keyof T> | Exclude<"empty_as_null", keyof T> | { [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T]] extends infer T_29 extends keyof (Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"sum">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_32 extends keyof T ? { [P_1 in T_32]: T[P_1]; } : never)]: T[K]; }) ? { [P_8 in T_29]: (Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"sum">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_30 extends keyof T ? { [P_1 in T_30]: T[P_1]; } : never)]: T[K]; })[P_8]; } : never)]: TypeOf<(Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"sum">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_33 extends keyof T ? { [P_1 in T_33]: T[P_1]; } : never)]: T[K]; })[K_8]>; }> | Readonly<{ [K_9 in keyof ((Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation" | "time_field" | "multi_value"> & {
    operation: import("@kbn/config-schema").Type<"last_value">;
    time_field: import("@kbn/config-schema").Type<string>;
    multi_value: import("@kbn/config-schema").Type<boolean>;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_35 extends keyof T ? { [P_1 in T_35]: T[P_1]; } : never)]: T[K]; } extends infer T_34 extends Props ? { [Key_9 in keyof T_34]: undefined extends TypeOf<T_34[Key_9]> ? Key_9 : never; } : never)[Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"field", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T> | Exclude<"time_shift", keyof T> | { [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] | Exclude<"time_field", keyof T> | Exclude<"multi_value", keyof T>] extends infer T_33 extends keyof (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation" | "time_field" | "multi_value"> & {
    operation: import("@kbn/config-schema").Type<"last_value">;
    time_field: import("@kbn/config-schema").Type<string>;
    multi_value: import("@kbn/config-schema").Type<boolean>;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_36 extends keyof T ? { [P_1 in T_36]: T[P_1]; } : never)]: T[K]; }) ? { [P_9 in T_33]: (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation" | "time_field" | "multi_value"> & {
    operation: import("@kbn/config-schema").Type<"last_value">;
    time_field: import("@kbn/config-schema").Type<string>;
    multi_value: import("@kbn/config-schema").Type<boolean>;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_34 extends keyof T ? { [P_1 in T_34]: T[P_1]; } : never)]: T[K]; })[P_9]; } : never)]?: TypeOf<(Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation" | "time_field" | "multi_value"> & {
    operation: import("@kbn/config-schema").Type<"last_value">;
    time_field: import("@kbn/config-schema").Type<string>;
    multi_value: import("@kbn/config-schema").Type<boolean>;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_37 extends keyof T ? { [P_1 in T_37]: T[P_1]; } : never)]: T[K]; })[K_9]> | undefined; } & { [K_10 in keyof ((Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation" | "time_field" | "multi_value"> & {
    operation: import("@kbn/config-schema").Type<"last_value">;
    time_field: import("@kbn/config-schema").Type<string>;
    multi_value: import("@kbn/config-schema").Type<boolean>;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_39 extends keyof T ? { [P_1 in T_39]: T[P_1]; } : never)]: T[K]; } extends infer T_38 extends Props ? { [Key_10 in keyof T_38]: undefined extends TypeOf<T_38[Key_10]> ? never : Key_10; } : never)[Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"field", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T> | Exclude<"time_shift", keyof T> | { [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] | Exclude<"time_field", keyof T> | Exclude<"multi_value", keyof T>] extends infer T_37 extends keyof (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation" | "time_field" | "multi_value"> & {
    operation: import("@kbn/config-schema").Type<"last_value">;
    time_field: import("@kbn/config-schema").Type<string>;
    multi_value: import("@kbn/config-schema").Type<boolean>;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_40 extends keyof T ? { [P_1 in T_40]: T[P_1]; } : never)]: T[K]; }) ? { [P_10 in T_37]: (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation" | "time_field" | "multi_value"> & {
    operation: import("@kbn/config-schema").Type<"last_value">;
    time_field: import("@kbn/config-schema").Type<string>;
    multi_value: import("@kbn/config-schema").Type<boolean>;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_38 extends keyof T ? { [P_1 in T_38]: T[P_1]; } : never)]: T[K]; })[P_10]; } : never)]: TypeOf<(Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation" | "time_field" | "multi_value"> & {
    operation: import("@kbn/config-schema").Type<"last_value">;
    time_field: import("@kbn/config-schema").Type<string>;
    multi_value: import("@kbn/config-schema").Type<boolean>;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_41 extends keyof T ? { [P_1 in T_41]: T[P_1]; } : never)]: T[K]; })[K_10]>; }> | Readonly<{ [K_11 in keyof ((Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "percentile" | "operation"> & {
    percentile: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"percentile">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_43 extends keyof T ? { [P_1 in T_43]: T[P_1]; } : never)]: T[K]; } extends infer T_42 extends Props ? { [Key_11 in keyof T_42]: undefined extends TypeOf<T_42[Key_11]> ? Key_11 : never; } : never)[Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"field", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T> | Exclude<"time_shift", keyof T> | { [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] | Exclude<"percentile", keyof T>] extends infer T_41 extends keyof (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "percentile" | "operation"> & {
    percentile: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"percentile">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_44 extends keyof T ? { [P_1 in T_44]: T[P_1]; } : never)]: T[K]; }) ? { [P_11 in T_41]: (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "percentile" | "operation"> & {
    percentile: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"percentile">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_42 extends keyof T ? { [P_1 in T_42]: T[P_1]; } : never)]: T[K]; })[P_11]; } : never)]?: TypeOf<(Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "percentile" | "operation"> & {
    percentile: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"percentile">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_45 extends keyof T ? { [P_1 in T_45]: T[P_1]; } : never)]: T[K]; })[K_11]> | undefined; } & { [K_12 in keyof ((Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "percentile" | "operation"> & {
    percentile: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"percentile">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_47 extends keyof T ? { [P_1 in T_47]: T[P_1]; } : never)]: T[K]; } extends infer T_46 extends Props ? { [Key_12 in keyof T_46]: undefined extends TypeOf<T_46[Key_12]> ? never : Key_12; } : never)[Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"field", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T> | Exclude<"time_shift", keyof T> | { [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] | Exclude<"percentile", keyof T>] extends infer T_45 extends keyof (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "percentile" | "operation"> & {
    percentile: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"percentile">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_48 extends keyof T ? { [P_1 in T_48]: T[P_1]; } : never)]: T[K]; }) ? { [P_12 in T_45]: (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "percentile" | "operation"> & {
    percentile: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"percentile">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_46 extends keyof T ? { [P_1 in T_46]: T[P_1]; } : never)]: T[K]; })[P_12]; } : never)]: TypeOf<(Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "percentile" | "operation"> & {
    percentile: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"percentile">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_49 extends keyof T ? { [P_1 in T_49]: T[P_1]; } : never)]: T[K]; })[K_12]>; }> | Readonly<{ [K_13 in keyof ((Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "rank" | "operation"> & {
    rank: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"percentile_rank">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_51 extends keyof T ? { [P_1 in T_51]: T[P_1]; } : never)]: T[K]; } extends infer T_50 extends Props ? { [Key_13 in keyof T_50]: undefined extends TypeOf<T_50[Key_13]> ? Key_13 : never; } : never)[Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"field", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T> | Exclude<"time_shift", keyof T> | { [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] | Exclude<"rank", keyof T>] extends infer T_49 extends keyof (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "rank" | "operation"> & {
    rank: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"percentile_rank">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_52 extends keyof T ? { [P_1 in T_52]: T[P_1]; } : never)]: T[K]; }) ? { [P_13 in T_49]: (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "rank" | "operation"> & {
    rank: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"percentile_rank">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_50 extends keyof T ? { [P_1 in T_50]: T[P_1]; } : never)]: T[K]; })[P_13]; } : never)]?: TypeOf<(Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "rank" | "operation"> & {
    rank: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"percentile_rank">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_53 extends keyof T ? { [P_1 in T_53]: T[P_1]; } : never)]: T[K]; })[K_13]> | undefined; } & { [K_14 in keyof ((Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "rank" | "operation"> & {
    rank: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"percentile_rank">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_55 extends keyof T ? { [P_1 in T_55]: T[P_1]; } : never)]: T[K]; } extends infer T_54 extends Props ? { [Key_14 in keyof T_54]: undefined extends TypeOf<T_54[Key_14]> ? never : Key_14; } : never)[Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"field", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T> | Exclude<"time_shift", keyof T> | { [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] | Exclude<"rank", keyof T>] extends infer T_53 extends keyof (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "rank" | "operation"> & {
    rank: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"percentile_rank">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_56 extends keyof T ? { [P_1 in T_56]: T[P_1]; } : never)]: T[K]; }) ? { [P_14 in T_53]: (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "rank" | "operation"> & {
    rank: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"percentile_rank">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_54 extends keyof T ? { [P_1 in T_54]: T[P_1]; } : never)]: T[K]; })[P_14]; } : never)]: TypeOf<(Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "rank" | "operation"> & {
    rank: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"percentile_rank">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_57 extends keyof T ? { [P_1 in T_57]: T[P_1]; } : never)]: T[K]; })[K_14]>; }> | Readonly<{ [K_15 in keyof ((Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "formula" | "operation" | "time_scale" | "reduced_time_range"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    formula: import("@kbn/config-schema").Type<string>;
    operation: import("@kbn/config-schema").Type<"formula">;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_59 extends keyof T ? { [P_1 in T_59]: T[P_1]; } : never)]: T[K]; } extends infer T_58 extends Props ? { [Key_15 in keyof T_58]: undefined extends TypeOf<T_58[Key_15]> ? Key_15 : never; } : never)[{ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] | Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"formula", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T>] extends infer T_57 extends keyof (Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "formula" | "operation" | "time_scale" | "reduced_time_range"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    formula: import("@kbn/config-schema").Type<string>;
    operation: import("@kbn/config-schema").Type<"formula">;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_60 extends keyof T ? { [P_1 in T_60]: T[P_1]; } : never)]: T[K]; }) ? { [P_15 in T_57]: (Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "formula" | "operation" | "time_scale" | "reduced_time_range"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    formula: import("@kbn/config-schema").Type<string>;
    operation: import("@kbn/config-schema").Type<"formula">;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_58 extends keyof T ? { [P_1 in T_58]: T[P_1]; } : never)]: T[K]; })[P_15]; } : never)]?: TypeOf<(Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "formula" | "operation" | "time_scale" | "reduced_time_range"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    formula: import("@kbn/config-schema").Type<string>;
    operation: import("@kbn/config-schema").Type<"formula">;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_61 extends keyof T ? { [P_1 in T_61]: T[P_1]; } : never)]: T[K]; })[K_15]> | undefined; } & { [K_16 in keyof ((Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "formula" | "operation" | "time_scale" | "reduced_time_range"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    formula: import("@kbn/config-schema").Type<string>;
    operation: import("@kbn/config-schema").Type<"formula">;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_63 extends keyof T ? { [P_1 in T_63]: T[P_1]; } : never)]: T[K]; } extends infer T_62 extends Props ? { [Key_16 in keyof T_62]: undefined extends TypeOf<T_62[Key_16]> ? never : Key_16; } : never)[{ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] | Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"formula", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T>] extends infer T_61 extends keyof (Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "formula" | "operation" | "time_scale" | "reduced_time_range"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    formula: import("@kbn/config-schema").Type<string>;
    operation: import("@kbn/config-schema").Type<"formula">;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_64 extends keyof T ? { [P_1 in T_64]: T[P_1]; } : never)]: T[K]; }) ? { [P_16 in T_61]: (Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "formula" | "operation" | "time_scale" | "reduced_time_range"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    formula: import("@kbn/config-schema").Type<string>;
    operation: import("@kbn/config-schema").Type<"formula">;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_62 extends keyof T ? { [P_1 in T_62]: T[P_1]; } : never)]: T[K]; })[P_16]; } : never)]: TypeOf<(Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "formula" | "operation" | "time_scale" | "reduced_time_range"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    formula: import("@kbn/config-schema").Type<string>;
    operation: import("@kbn/config-schema").Type<"formula">;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_65 extends keyof T ? { [P_1 in T_65]: T[P_1]; } : never)]: T[K]; })[K_16]>; }>>;
export declare function mergeAllMetricsWithChartDimensionSchemaWithRefBasedOps<T extends Props>(baseSchema: T, context: string): import("@kbn/config-schema").Type<Readonly<{ [K_1 in keyof ((Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "field" | "operation"> & {
    field: import("@kbn/config-schema").Type<string | undefined>;
    operation: import("@kbn/config-schema").Type<"count">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_3 extends keyof T ? { [P_1 in T_3]: T[P_1]; } : never)]: T[K]; } extends infer T_2 extends Props ? { [Key in keyof T_2]: undefined extends TypeOf<T_2[Key]> ? Key : never; } : never)[Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"field", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T> | Exclude<"time_shift", keyof T> | Exclude<"empty_as_null", keyof T> | { [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T]] extends infer T_1 extends keyof (Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "field" | "operation"> & {
    field: import("@kbn/config-schema").Type<string | undefined>;
    operation: import("@kbn/config-schema").Type<"count">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_4 extends keyof T ? { [P_1 in T_4]: T[P_1]; } : never)]: T[K]; }) ? { [P in T_1]: (Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "field" | "operation"> & {
    field: import("@kbn/config-schema").Type<string | undefined>;
    operation: import("@kbn/config-schema").Type<"count">;
}, keyof T> & { [K in keyof ({ [Key in keyof T]: undefined extends T[Key] ? never : null extends T[Key] ? never : Key; }[keyof T] extends infer T_2 extends keyof T ? { [P_2 in T_2]: T[P_2]; } : never)]: T[K]; })[P]; } : never)]?: TypeOf<(Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "field" | "operation"> & {
    field: import("@kbn/config-schema").Type<string | undefined>;
    operation: import("@kbn/config-schema").Type<"count">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_5 extends keyof T ? { [P_1 in T_5]: T[P_1]; } : never)]: T[K]; })[K_1]> | undefined; } & { [K_2 in keyof ((Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "field" | "operation"> & {
    field: import("@kbn/config-schema").Type<string | undefined>;
    operation: import("@kbn/config-schema").Type<"count">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_7 extends keyof T ? { [P_1 in T_7]: T[P_1]; } : never)]: T[K]; } extends infer T_6 extends Props ? { [Key_2 in keyof T_6]: undefined extends TypeOf<T_6[Key_2]> ? never : Key_2; } : never)[Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"field", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T> | Exclude<"time_shift", keyof T> | Exclude<"empty_as_null", keyof T> | { [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T]] extends infer T_5 extends keyof (Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "field" | "operation"> & {
    field: import("@kbn/config-schema").Type<string | undefined>;
    operation: import("@kbn/config-schema").Type<"count">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_8 extends keyof T ? { [P_1 in T_8]: T[P_1]; } : never)]: T[K]; }) ? { [P_2 in T_5]: (Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "field" | "operation"> & {
    field: import("@kbn/config-schema").Type<string | undefined>;
    operation: import("@kbn/config-schema").Type<"count">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_6 extends keyof T ? { [P_1 in T_6]: T[P_1]; } : never)]: T[K]; })[P_2]; } : never)]: TypeOf<(Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "field" | "operation"> & {
    field: import("@kbn/config-schema").Type<string | undefined>;
    operation: import("@kbn/config-schema").Type<"count">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_9 extends keyof T ? { [P_1 in T_9]: T[P_1]; } : never)]: T[K]; })[K_2]>; }> | Readonly<{ [K_3 in keyof ((Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"unique_count">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_11 extends keyof T ? { [P_1 in T_11]: T[P_1]; } : never)]: T[K]; } extends infer T_10 extends Props ? { [Key_3 in keyof T_10]: undefined extends TypeOf<T_10[Key_3]> ? Key_3 : never; } : never)[Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"field", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T> | Exclude<"time_shift", keyof T> | Exclude<"empty_as_null", keyof T> | { [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T]] extends infer T_9 extends keyof (Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"unique_count">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_12 extends keyof T ? { [P_1 in T_12]: T[P_1]; } : never)]: T[K]; }) ? { [P_3 in T_9]: (Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"unique_count">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_10 extends keyof T ? { [P_1 in T_10]: T[P_1]; } : never)]: T[K]; })[P_3]; } : never)]?: TypeOf<(Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"unique_count">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_13 extends keyof T ? { [P_1 in T_13]: T[P_1]; } : never)]: T[K]; })[K_3]> | undefined; } & { [K_4 in keyof ((Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"unique_count">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_15 extends keyof T ? { [P_1 in T_15]: T[P_1]; } : never)]: T[K]; } extends infer T_14 extends Props ? { [Key_4 in keyof T_14]: undefined extends TypeOf<T_14[Key_4]> ? never : Key_4; } : never)[Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"field", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T> | Exclude<"time_shift", keyof T> | Exclude<"empty_as_null", keyof T> | { [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T]] extends infer T_13 extends keyof (Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"unique_count">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_16 extends keyof T ? { [P_1 in T_16]: T[P_1]; } : never)]: T[K]; }) ? { [P_4 in T_13]: (Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"unique_count">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_14 extends keyof T ? { [P_1 in T_14]: T[P_1]; } : never)]: T[K]; })[P_4]; } : never)]: TypeOf<(Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"unique_count">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_17 extends keyof T ? { [P_1 in T_17]: T[P_1]; } : never)]: T[K]; })[K_4]>; }> | Readonly<{ [K_5 in keyof ((Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"min" | "max" | "average" | "median" | "standard_deviation">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_19 extends keyof T ? { [P_1 in T_19]: T[P_1]; } : never)]: T[K]; } extends infer T_18 extends Props ? { [Key_5 in keyof T_18]: undefined extends TypeOf<T_18[Key_5]> ? Key_5 : never; } : never)[Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"field", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T> | Exclude<"time_shift", keyof T> | { [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T]] extends infer T_17 extends keyof (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"min" | "max" | "average" | "median" | "standard_deviation">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_20 extends keyof T ? { [P_1 in T_20]: T[P_1]; } : never)]: T[K]; }) ? { [P_5 in T_17]: (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"min" | "max" | "average" | "median" | "standard_deviation">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_18 extends keyof T ? { [P_1 in T_18]: T[P_1]; } : never)]: T[K]; })[P_5]; } : never)]?: TypeOf<(Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"min" | "max" | "average" | "median" | "standard_deviation">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_21 extends keyof T ? { [P_1 in T_21]: T[P_1]; } : never)]: T[K]; })[K_5]> | undefined; } & { [K_6 in keyof ((Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"min" | "max" | "average" | "median" | "standard_deviation">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_23 extends keyof T ? { [P_1 in T_23]: T[P_1]; } : never)]: T[K]; } extends infer T_22 extends Props ? { [Key_6 in keyof T_22]: undefined extends TypeOf<T_22[Key_6]> ? never : Key_6; } : never)[Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"field", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T> | Exclude<"time_shift", keyof T> | { [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T]] extends infer T_21 extends keyof (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"min" | "max" | "average" | "median" | "standard_deviation">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_24 extends keyof T ? { [P_1 in T_24]: T[P_1]; } : never)]: T[K]; }) ? { [P_6 in T_21]: (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"min" | "max" | "average" | "median" | "standard_deviation">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_22 extends keyof T ? { [P_1 in T_22]: T[P_1]; } : never)]: T[K]; })[P_6]; } : never)]: TypeOf<(Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"min" | "max" | "average" | "median" | "standard_deviation">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_25 extends keyof T ? { [P_1 in T_25]: T[P_1]; } : never)]: T[K]; })[K_6]>; }> | Readonly<{ [K_7 in keyof ((Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"sum">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_27 extends keyof T ? { [P_1 in T_27]: T[P_1]; } : never)]: T[K]; } extends infer T_26 extends Props ? { [Key_7 in keyof T_26]: undefined extends TypeOf<T_26[Key_7]> ? Key_7 : never; } : never)[Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"field", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T> | Exclude<"time_shift", keyof T> | Exclude<"empty_as_null", keyof T> | { [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T]] extends infer T_25 extends keyof (Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"sum">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_28 extends keyof T ? { [P_1 in T_28]: T[P_1]; } : never)]: T[K]; }) ? { [P_7 in T_25]: (Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"sum">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_26 extends keyof T ? { [P_1 in T_26]: T[P_1]; } : never)]: T[K]; })[P_7]; } : never)]?: TypeOf<(Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"sum">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_29 extends keyof T ? { [P_1 in T_29]: T[P_1]; } : never)]: T[K]; })[K_7]> | undefined; } & { [K_8 in keyof ((Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"sum">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_31 extends keyof T ? { [P_1 in T_31]: T[P_1]; } : never)]: T[K]; } extends infer T_30 extends Props ? { [Key_8 in keyof T_30]: undefined extends TypeOf<T_30[Key_8]> ? never : Key_8; } : never)[Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"field", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T> | Exclude<"time_shift", keyof T> | Exclude<"empty_as_null", keyof T> | { [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T]] extends infer T_29 extends keyof (Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"sum">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_32 extends keyof T ? { [P_1 in T_32]: T[P_1]; } : never)]: T[K]; }) ? { [P_8 in T_29]: (Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"sum">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_30 extends keyof T ? { [P_1 in T_30]: T[P_1]; } : never)]: T[K]; })[P_8]; } : never)]: TypeOf<(Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"sum">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_33 extends keyof T ? { [P_1 in T_33]: T[P_1]; } : never)]: T[K]; })[K_8]>; }> | Readonly<{ [K_9 in keyof ((Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation" | "time_field" | "multi_value"> & {
    operation: import("@kbn/config-schema").Type<"last_value">;
    time_field: import("@kbn/config-schema").Type<string>;
    multi_value: import("@kbn/config-schema").Type<boolean>;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_35 extends keyof T ? { [P_1 in T_35]: T[P_1]; } : never)]: T[K]; } extends infer T_34 extends Props ? { [Key_9 in keyof T_34]: undefined extends TypeOf<T_34[Key_9]> ? Key_9 : never; } : never)[Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"field", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T> | Exclude<"time_shift", keyof T> | { [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] | Exclude<"time_field", keyof T> | Exclude<"multi_value", keyof T>] extends infer T_33 extends keyof (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation" | "time_field" | "multi_value"> & {
    operation: import("@kbn/config-schema").Type<"last_value">;
    time_field: import("@kbn/config-schema").Type<string>;
    multi_value: import("@kbn/config-schema").Type<boolean>;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_36 extends keyof T ? { [P_1 in T_36]: T[P_1]; } : never)]: T[K]; }) ? { [P_9 in T_33]: (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation" | "time_field" | "multi_value"> & {
    operation: import("@kbn/config-schema").Type<"last_value">;
    time_field: import("@kbn/config-schema").Type<string>;
    multi_value: import("@kbn/config-schema").Type<boolean>;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_34 extends keyof T ? { [P_1 in T_34]: T[P_1]; } : never)]: T[K]; })[P_9]; } : never)]?: TypeOf<(Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation" | "time_field" | "multi_value"> & {
    operation: import("@kbn/config-schema").Type<"last_value">;
    time_field: import("@kbn/config-schema").Type<string>;
    multi_value: import("@kbn/config-schema").Type<boolean>;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_37 extends keyof T ? { [P_1 in T_37]: T[P_1]; } : never)]: T[K]; })[K_9]> | undefined; } & { [K_10 in keyof ((Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation" | "time_field" | "multi_value"> & {
    operation: import("@kbn/config-schema").Type<"last_value">;
    time_field: import("@kbn/config-schema").Type<string>;
    multi_value: import("@kbn/config-schema").Type<boolean>;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_39 extends keyof T ? { [P_1 in T_39]: T[P_1]; } : never)]: T[K]; } extends infer T_38 extends Props ? { [Key_10 in keyof T_38]: undefined extends TypeOf<T_38[Key_10]> ? never : Key_10; } : never)[Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"field", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T> | Exclude<"time_shift", keyof T> | { [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] | Exclude<"time_field", keyof T> | Exclude<"multi_value", keyof T>] extends infer T_37 extends keyof (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation" | "time_field" | "multi_value"> & {
    operation: import("@kbn/config-schema").Type<"last_value">;
    time_field: import("@kbn/config-schema").Type<string>;
    multi_value: import("@kbn/config-schema").Type<boolean>;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_40 extends keyof T ? { [P_1 in T_40]: T[P_1]; } : never)]: T[K]; }) ? { [P_10 in T_37]: (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation" | "time_field" | "multi_value"> & {
    operation: import("@kbn/config-schema").Type<"last_value">;
    time_field: import("@kbn/config-schema").Type<string>;
    multi_value: import("@kbn/config-schema").Type<boolean>;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_38 extends keyof T ? { [P_1 in T_38]: T[P_1]; } : never)]: T[K]; })[P_10]; } : never)]: TypeOf<(Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation" | "time_field" | "multi_value"> & {
    operation: import("@kbn/config-schema").Type<"last_value">;
    time_field: import("@kbn/config-schema").Type<string>;
    multi_value: import("@kbn/config-schema").Type<boolean>;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_41 extends keyof T ? { [P_1 in T_41]: T[P_1]; } : never)]: T[K]; })[K_10]>; }> | Readonly<{ [K_11 in keyof ((Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "percentile" | "operation"> & {
    percentile: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"percentile">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_43 extends keyof T ? { [P_1 in T_43]: T[P_1]; } : never)]: T[K]; } extends infer T_42 extends Props ? { [Key_11 in keyof T_42]: undefined extends TypeOf<T_42[Key_11]> ? Key_11 : never; } : never)[Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"field", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T> | Exclude<"time_shift", keyof T> | { [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] | Exclude<"percentile", keyof T>] extends infer T_41 extends keyof (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "percentile" | "operation"> & {
    percentile: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"percentile">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_44 extends keyof T ? { [P_1 in T_44]: T[P_1]; } : never)]: T[K]; }) ? { [P_11 in T_41]: (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "percentile" | "operation"> & {
    percentile: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"percentile">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_42 extends keyof T ? { [P_1 in T_42]: T[P_1]; } : never)]: T[K]; })[P_11]; } : never)]?: TypeOf<(Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "percentile" | "operation"> & {
    percentile: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"percentile">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_45 extends keyof T ? { [P_1 in T_45]: T[P_1]; } : never)]: T[K]; })[K_11]> | undefined; } & { [K_12 in keyof ((Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "percentile" | "operation"> & {
    percentile: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"percentile">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_47 extends keyof T ? { [P_1 in T_47]: T[P_1]; } : never)]: T[K]; } extends infer T_46 extends Props ? { [Key_12 in keyof T_46]: undefined extends TypeOf<T_46[Key_12]> ? never : Key_12; } : never)[Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"field", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T> | Exclude<"time_shift", keyof T> | { [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] | Exclude<"percentile", keyof T>] extends infer T_45 extends keyof (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "percentile" | "operation"> & {
    percentile: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"percentile">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_48 extends keyof T ? { [P_1 in T_48]: T[P_1]; } : never)]: T[K]; }) ? { [P_12 in T_45]: (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "percentile" | "operation"> & {
    percentile: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"percentile">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_46 extends keyof T ? { [P_1 in T_46]: T[P_1]; } : never)]: T[K]; })[P_12]; } : never)]: TypeOf<(Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "percentile" | "operation"> & {
    percentile: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"percentile">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_49 extends keyof T ? { [P_1 in T_49]: T[P_1]; } : never)]: T[K]; })[K_12]>; }> | Readonly<{ [K_13 in keyof ((Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "rank" | "operation"> & {
    rank: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"percentile_rank">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_51 extends keyof T ? { [P_1 in T_51]: T[P_1]; } : never)]: T[K]; } extends infer T_50 extends Props ? { [Key_13 in keyof T_50]: undefined extends TypeOf<T_50[Key_13]> ? Key_13 : never; } : never)[Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"field", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T> | Exclude<"time_shift", keyof T> | { [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] | Exclude<"rank", keyof T>] extends infer T_49 extends keyof (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "rank" | "operation"> & {
    rank: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"percentile_rank">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_52 extends keyof T ? { [P_1 in T_52]: T[P_1]; } : never)]: T[K]; }) ? { [P_13 in T_49]: (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "rank" | "operation"> & {
    rank: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"percentile_rank">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_50 extends keyof T ? { [P_1 in T_50]: T[P_1]; } : never)]: T[K]; })[P_13]; } : never)]?: TypeOf<(Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "rank" | "operation"> & {
    rank: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"percentile_rank">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_53 extends keyof T ? { [P_1 in T_53]: T[P_1]; } : never)]: T[K]; })[K_13]> | undefined; } & { [K_14 in keyof ((Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "rank" | "operation"> & {
    rank: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"percentile_rank">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_55 extends keyof T ? { [P_1 in T_55]: T[P_1]; } : never)]: T[K]; } extends infer T_54 extends Props ? { [Key_14 in keyof T_54]: undefined extends TypeOf<T_54[Key_14]> ? never : Key_14; } : never)[Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"field", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T> | Exclude<"time_shift", keyof T> | { [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] | Exclude<"rank", keyof T>] extends infer T_53 extends keyof (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "rank" | "operation"> & {
    rank: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"percentile_rank">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_56 extends keyof T ? { [P_1 in T_56]: T[P_1]; } : never)]: T[K]; }) ? { [P_14 in T_53]: (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "rank" | "operation"> & {
    rank: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"percentile_rank">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_54 extends keyof T ? { [P_1 in T_54]: T[P_1]; } : never)]: T[K]; })[P_14]; } : never)]: TypeOf<(Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "rank" | "operation"> & {
    rank: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"percentile_rank">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_57 extends keyof T ? { [P_1 in T_57]: T[P_1]; } : never)]: T[K]; })[K_14]>; }> | Readonly<{ [K_15 in keyof ((Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "of" | "operation"> & {
    of: import("@kbn/config-schema").Type<Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        field?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        operation: "count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "unique_count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "min" | "max" | "average" | "median" | "standard_deviation";
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "sum";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "last_value";
        time_field: string;
        multi_value: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        percentile: number;
        operation: "percentile";
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        rank: number;
        operation: "percentile_rank";
    }>>;
    operation: import("@kbn/config-schema").Type<"differences">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_59 extends keyof T ? { [P_1 in T_59]: T[P_1]; } : never)]: T[K]; } extends infer T_58 extends Props ? { [Key_15 in keyof T_58]: undefined extends TypeOf<T_58[Key_15]> ? Key_15 : never; } : never)[Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T> | Exclude<"time_shift", keyof T> | { [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] | Exclude<"of", keyof T>] extends infer T_57 extends keyof (Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "of" | "operation"> & {
    of: import("@kbn/config-schema").Type<Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        field?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        operation: "count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "unique_count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "min" | "max" | "average" | "median" | "standard_deviation";
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "sum";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "last_value";
        time_field: string;
        multi_value: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        percentile: number;
        operation: "percentile";
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        rank: number;
        operation: "percentile_rank";
    }>>;
    operation: import("@kbn/config-schema").Type<"differences">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_60 extends keyof T ? { [P_1 in T_60]: T[P_1]; } : never)]: T[K]; }) ? { [P_15 in T_57]: (Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "of" | "operation"> & {
    of: import("@kbn/config-schema").Type<Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        field?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        operation: "count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "unique_count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "min" | "max" | "average" | "median" | "standard_deviation";
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "sum";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "last_value";
        time_field: string;
        multi_value: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        percentile: number;
        operation: "percentile";
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        rank: number;
        operation: "percentile_rank";
    }>>;
    operation: import("@kbn/config-schema").Type<"differences">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_58 extends keyof T ? { [P_1 in T_58]: T[P_1]; } : never)]: T[K]; })[P_15]; } : never)]?: TypeOf<(Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "of" | "operation"> & {
    of: import("@kbn/config-schema").Type<Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        field?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        operation: "count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "unique_count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "min" | "max" | "average" | "median" | "standard_deviation";
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "sum";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "last_value";
        time_field: string;
        multi_value: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        percentile: number;
        operation: "percentile";
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        rank: number;
        operation: "percentile_rank";
    }>>;
    operation: import("@kbn/config-schema").Type<"differences">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_61 extends keyof T ? { [P_1 in T_61]: T[P_1]; } : never)]: T[K]; })[K_15]> | undefined; } & { [K_16 in keyof ((Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "of" | "operation"> & {
    of: import("@kbn/config-schema").Type<Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        field?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        operation: "count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "unique_count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "min" | "max" | "average" | "median" | "standard_deviation";
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "sum";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "last_value";
        time_field: string;
        multi_value: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        percentile: number;
        operation: "percentile";
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        rank: number;
        operation: "percentile_rank";
    }>>;
    operation: import("@kbn/config-schema").Type<"differences">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_63 extends keyof T ? { [P_1 in T_63]: T[P_1]; } : never)]: T[K]; } extends infer T_62 extends Props ? { [Key_16 in keyof T_62]: undefined extends TypeOf<T_62[Key_16]> ? never : Key_16; } : never)[Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T> | Exclude<"time_shift", keyof T> | { [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] | Exclude<"of", keyof T>] extends infer T_61 extends keyof (Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "of" | "operation"> & {
    of: import("@kbn/config-schema").Type<Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        field?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        operation: "count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "unique_count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "min" | "max" | "average" | "median" | "standard_deviation";
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "sum";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "last_value";
        time_field: string;
        multi_value: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        percentile: number;
        operation: "percentile";
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        rank: number;
        operation: "percentile_rank";
    }>>;
    operation: import("@kbn/config-schema").Type<"differences">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_64 extends keyof T ? { [P_1 in T_64]: T[P_1]; } : never)]: T[K]; }) ? { [P_16 in T_61]: (Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "of" | "operation"> & {
    of: import("@kbn/config-schema").Type<Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        field?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        operation: "count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "unique_count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "min" | "max" | "average" | "median" | "standard_deviation";
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "sum";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "last_value";
        time_field: string;
        multi_value: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        percentile: number;
        operation: "percentile";
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        rank: number;
        operation: "percentile_rank";
    }>>;
    operation: import("@kbn/config-schema").Type<"differences">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_62 extends keyof T ? { [P_1 in T_62]: T[P_1]; } : never)]: T[K]; })[P_16]; } : never)]: TypeOf<(Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "of" | "operation"> & {
    of: import("@kbn/config-schema").Type<Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        field?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        operation: "count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "unique_count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "min" | "max" | "average" | "median" | "standard_deviation";
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "sum";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "last_value";
        time_field: string;
        multi_value: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        percentile: number;
        operation: "percentile";
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        rank: number;
        operation: "percentile_rank";
    }>>;
    operation: import("@kbn/config-schema").Type<"differences">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_65 extends keyof T ? { [P_1 in T_65]: T[P_1]; } : never)]: T[K]; })[K_16]>; }> | Readonly<{ [K_17 in keyof ((Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "of" | "window" | "operation"> & {
    of: import("@kbn/config-schema").Type<Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        field?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        operation: "count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "unique_count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "min" | "max" | "average" | "median" | "standard_deviation";
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "sum";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "last_value";
        time_field: string;
        multi_value: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        percentile: number;
        operation: "percentile";
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        rank: number;
        operation: "percentile_rank";
    }>>;
    window: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"moving_average">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_67 extends keyof T ? { [P_1 in T_67]: T[P_1]; } : never)]: T[K]; } extends infer T_66 extends Props ? { [Key_17 in keyof T_66]: undefined extends TypeOf<T_66[Key_17]> ? Key_17 : never; } : never)[Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T> | Exclude<"time_shift", keyof T> | { [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] | Exclude<"of", keyof T> | Exclude<"window", keyof T>] extends infer T_65 extends keyof (Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "of" | "window" | "operation"> & {
    of: import("@kbn/config-schema").Type<Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        field?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        operation: "count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "unique_count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "min" | "max" | "average" | "median" | "standard_deviation";
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "sum";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "last_value";
        time_field: string;
        multi_value: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        percentile: number;
        operation: "percentile";
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        rank: number;
        operation: "percentile_rank";
    }>>;
    window: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"moving_average">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_68 extends keyof T ? { [P_1 in T_68]: T[P_1]; } : never)]: T[K]; }) ? { [P_17 in T_65]: (Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "of" | "window" | "operation"> & {
    of: import("@kbn/config-schema").Type<Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        field?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        operation: "count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "unique_count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "min" | "max" | "average" | "median" | "standard_deviation";
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "sum";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "last_value";
        time_field: string;
        multi_value: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        percentile: number;
        operation: "percentile";
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        rank: number;
        operation: "percentile_rank";
    }>>;
    window: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"moving_average">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_66 extends keyof T ? { [P_1 in T_66]: T[P_1]; } : never)]: T[K]; })[P_17]; } : never)]?: TypeOf<(Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "of" | "window" | "operation"> & {
    of: import("@kbn/config-schema").Type<Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        field?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        operation: "count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "unique_count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "min" | "max" | "average" | "median" | "standard_deviation";
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "sum";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "last_value";
        time_field: string;
        multi_value: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        percentile: number;
        operation: "percentile";
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        rank: number;
        operation: "percentile_rank";
    }>>;
    window: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"moving_average">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_69 extends keyof T ? { [P_1 in T_69]: T[P_1]; } : never)]: T[K]; })[K_17]> | undefined; } & { [K_18 in keyof ((Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "of" | "window" | "operation"> & {
    of: import("@kbn/config-schema").Type<Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        field?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        operation: "count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "unique_count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "min" | "max" | "average" | "median" | "standard_deviation";
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "sum";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "last_value";
        time_field: string;
        multi_value: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        percentile: number;
        operation: "percentile";
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        rank: number;
        operation: "percentile_rank";
    }>>;
    window: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"moving_average">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_71 extends keyof T ? { [P_1 in T_71]: T[P_1]; } : never)]: T[K]; } extends infer T_70 extends Props ? { [Key_18 in keyof T_70]: undefined extends TypeOf<T_70[Key_18]> ? never : Key_18; } : never)[Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T> | Exclude<"time_shift", keyof T> | { [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] | Exclude<"of", keyof T> | Exclude<"window", keyof T>] extends infer T_69 extends keyof (Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "of" | "window" | "operation"> & {
    of: import("@kbn/config-schema").Type<Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        field?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        operation: "count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "unique_count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "min" | "max" | "average" | "median" | "standard_deviation";
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "sum";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "last_value";
        time_field: string;
        multi_value: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        percentile: number;
        operation: "percentile";
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        rank: number;
        operation: "percentile_rank";
    }>>;
    window: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"moving_average">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_72 extends keyof T ? { [P_1 in T_72]: T[P_1]; } : never)]: T[K]; }) ? { [P_18 in T_69]: (Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "of" | "window" | "operation"> & {
    of: import("@kbn/config-schema").Type<Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        field?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        operation: "count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "unique_count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "min" | "max" | "average" | "median" | "standard_deviation";
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "sum";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "last_value";
        time_field: string;
        multi_value: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        percentile: number;
        operation: "percentile";
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        rank: number;
        operation: "percentile_rank";
    }>>;
    window: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"moving_average">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_70 extends keyof T ? { [P_1 in T_70]: T[P_1]; } : never)]: T[K]; })[P_18]; } : never)]: TypeOf<(Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "of" | "window" | "operation"> & {
    of: import("@kbn/config-schema").Type<Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        field?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        operation: "count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "unique_count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "min" | "max" | "average" | "median" | "standard_deviation";
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "sum";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "last_value";
        time_field: string;
        multi_value: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        percentile: number;
        operation: "percentile";
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        rank: number;
        operation: "percentile_rank";
    }>>;
    window: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"moving_average">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_73 extends keyof T ? { [P_1 in T_73]: T[P_1]; } : never)]: T[K]; })[K_18]>; }> | Readonly<{ [K_19 in keyof ((Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"cumulative_sum">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_75 extends keyof T ? { [P_1 in T_75]: T[P_1]; } : never)]: T[K]; } extends infer T_74 extends Props ? { [Key_19 in keyof T_74]: undefined extends TypeOf<T_74[Key_19]> ? Key_19 : never; } : never)[Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"field", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T> | Exclude<"time_shift", keyof T> | { [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T]] extends infer T_73 extends keyof (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"cumulative_sum">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_76 extends keyof T ? { [P_1 in T_76]: T[P_1]; } : never)]: T[K]; }) ? { [P_19 in T_73]: (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"cumulative_sum">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_74 extends keyof T ? { [P_1 in T_74]: T[P_1]; } : never)]: T[K]; })[P_19]; } : never)]?: TypeOf<(Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"cumulative_sum">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_77 extends keyof T ? { [P_1 in T_77]: T[P_1]; } : never)]: T[K]; })[K_19]> | undefined; } & { [K_20 in keyof ((Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"cumulative_sum">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_79 extends keyof T ? { [P_1 in T_79]: T[P_1]; } : never)]: T[K]; } extends infer T_78 extends Props ? { [Key_20 in keyof T_78]: undefined extends TypeOf<T_78[Key_20]> ? never : Key_20; } : never)[Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"field", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T> | Exclude<"time_shift", keyof T> | { [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T]] extends infer T_77 extends keyof (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"cumulative_sum">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_80 extends keyof T ? { [P_1 in T_80]: T[P_1]; } : never)]: T[K]; }) ? { [P_20 in T_77]: (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"cumulative_sum">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_78 extends keyof T ? { [P_1 in T_78]: T[P_1]; } : never)]: T[K]; })[P_20]; } : never)]: TypeOf<(Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"cumulative_sum">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_81 extends keyof T ? { [P_1 in T_81]: T[P_1]; } : never)]: T[K]; })[K_20]>; }> | Readonly<{ [K_21 in keyof ((Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"counter_rate">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_83 extends keyof T ? { [P_1 in T_83]: T[P_1]; } : never)]: T[K]; } extends infer T_82 extends Props ? { [Key_21 in keyof T_82]: undefined extends TypeOf<T_82[Key_21]> ? Key_21 : never; } : never)[Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"field", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T> | Exclude<"time_shift", keyof T> | { [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T]] extends infer T_81 extends keyof (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"counter_rate">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_84 extends keyof T ? { [P_1 in T_84]: T[P_1]; } : never)]: T[K]; }) ? { [P_21 in T_81]: (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"counter_rate">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_82 extends keyof T ? { [P_1 in T_82]: T[P_1]; } : never)]: T[K]; })[P_21]; } : never)]?: TypeOf<(Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"counter_rate">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_85 extends keyof T ? { [P_1 in T_85]: T[P_1]; } : never)]: T[K]; })[K_21]> | undefined; } & { [K_22 in keyof ((Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"counter_rate">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_87 extends keyof T ? { [P_1 in T_87]: T[P_1]; } : never)]: T[K]; } extends infer T_86 extends Props ? { [Key_22 in keyof T_86]: undefined extends TypeOf<T_86[Key_22]> ? never : Key_22; } : never)[Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"field", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T> | Exclude<"time_shift", keyof T> | { [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T]] extends infer T_85 extends keyof (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"counter_rate">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_88 extends keyof T ? { [P_1 in T_88]: T[P_1]; } : never)]: T[K]; }) ? { [P_22 in T_85]: (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"counter_rate">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_86 extends keyof T ? { [P_1 in T_86]: T[P_1]; } : never)]: T[K]; })[P_22]; } : never)]: TypeOf<(Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"counter_rate">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_89 extends keyof T ? { [P_1 in T_89]: T[P_1]; } : never)]: T[K]; })[K_22]>; }> | Readonly<{ [K_23 in keyof ((Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "formula" | "operation" | "time_scale" | "reduced_time_range"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    formula: import("@kbn/config-schema").Type<string>;
    operation: import("@kbn/config-schema").Type<"formula">;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_91 extends keyof T ? { [P_1 in T_91]: T[P_1]; } : never)]: T[K]; } extends infer T_90 extends Props ? { [Key_23 in keyof T_90]: undefined extends TypeOf<T_90[Key_23]> ? Key_23 : never; } : never)[{ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] | Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"formula", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T>] extends infer T_89 extends keyof (Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "formula" | "operation" | "time_scale" | "reduced_time_range"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    formula: import("@kbn/config-schema").Type<string>;
    operation: import("@kbn/config-schema").Type<"formula">;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_92 extends keyof T ? { [P_1 in T_92]: T[P_1]; } : never)]: T[K]; }) ? { [P_23 in T_89]: (Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "formula" | "operation" | "time_scale" | "reduced_time_range"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    formula: import("@kbn/config-schema").Type<string>;
    operation: import("@kbn/config-schema").Type<"formula">;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_90 extends keyof T ? { [P_1 in T_90]: T[P_1]; } : never)]: T[K]; })[P_23]; } : never)]?: TypeOf<(Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "formula" | "operation" | "time_scale" | "reduced_time_range"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    formula: import("@kbn/config-schema").Type<string>;
    operation: import("@kbn/config-schema").Type<"formula">;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_93 extends keyof T ? { [P_1 in T_93]: T[P_1]; } : never)]: T[K]; })[K_23]> | undefined; } & { [K_24 in keyof ((Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "formula" | "operation" | "time_scale" | "reduced_time_range"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    formula: import("@kbn/config-schema").Type<string>;
    operation: import("@kbn/config-schema").Type<"formula">;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_95 extends keyof T ? { [P_1 in T_95]: T[P_1]; } : never)]: T[K]; } extends infer T_94 extends Props ? { [Key_24 in keyof T_94]: undefined extends TypeOf<T_94[Key_24]> ? never : Key_24; } : never)[{ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] | Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"formula", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T>] extends infer T_93 extends keyof (Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "formula" | "operation" | "time_scale" | "reduced_time_range"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    formula: import("@kbn/config-schema").Type<string>;
    operation: import("@kbn/config-schema").Type<"formula">;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_96 extends keyof T ? { [P_1 in T_96]: T[P_1]; } : never)]: T[K]; }) ? { [P_24 in T_93]: (Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "formula" | "operation" | "time_scale" | "reduced_time_range"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    formula: import("@kbn/config-schema").Type<string>;
    operation: import("@kbn/config-schema").Type<"formula">;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_94 extends keyof T ? { [P_1 in T_94]: T[P_1]; } : never)]: T[K]; })[P_24]; } : never)]: TypeOf<(Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "formula" | "operation" | "time_scale" | "reduced_time_range"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    formula: import("@kbn/config-schema").Type<string>;
    operation: import("@kbn/config-schema").Type<"formula">;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_97 extends keyof T ? { [P_1 in T_97]: T[P_1]; } : never)]: T[K]; })[K_24]>; }>>;
export declare function mergeAllMetricsWithChartDimensionSchemaWithTimeBasedAndStaticOps<T extends Props>(baseSchema: T, context: string): import("@kbn/config-schema").Type<Readonly<{ [K_1 in keyof ((Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "field" | "operation"> & {
    field: import("@kbn/config-schema").Type<string | undefined>;
    operation: import("@kbn/config-schema").Type<"count">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_3 extends keyof T ? { [P_1 in T_3]: T[P_1]; } : never)]: T[K]; } extends infer T_2 extends Props ? { [Key in keyof T_2]: undefined extends TypeOf<T_2[Key]> ? Key : never; } : never)[Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"field", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T> | Exclude<"time_shift", keyof T> | Exclude<"empty_as_null", keyof T> | { [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T]] extends infer T_1 extends keyof (Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "field" | "operation"> & {
    field: import("@kbn/config-schema").Type<string | undefined>;
    operation: import("@kbn/config-schema").Type<"count">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_4 extends keyof T ? { [P_1 in T_4]: T[P_1]; } : never)]: T[K]; }) ? { [P in T_1]: (Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "field" | "operation"> & {
    field: import("@kbn/config-schema").Type<string | undefined>;
    operation: import("@kbn/config-schema").Type<"count">;
}, keyof T> & { [K in keyof ({ [Key in keyof T]: undefined extends T[Key] ? never : null extends T[Key] ? never : Key; }[keyof T] extends infer T_2 extends keyof T ? { [P_2 in T_2]: T[P_2]; } : never)]: T[K]; })[P]; } : never)]?: TypeOf<(Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "field" | "operation"> & {
    field: import("@kbn/config-schema").Type<string | undefined>;
    operation: import("@kbn/config-schema").Type<"count">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_5 extends keyof T ? { [P_1 in T_5]: T[P_1]; } : never)]: T[K]; })[K_1]> | undefined; } & { [K_2 in keyof ((Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "field" | "operation"> & {
    field: import("@kbn/config-schema").Type<string | undefined>;
    operation: import("@kbn/config-schema").Type<"count">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_7 extends keyof T ? { [P_1 in T_7]: T[P_1]; } : never)]: T[K]; } extends infer T_6 extends Props ? { [Key_2 in keyof T_6]: undefined extends TypeOf<T_6[Key_2]> ? never : Key_2; } : never)[Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"field", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T> | Exclude<"time_shift", keyof T> | Exclude<"empty_as_null", keyof T> | { [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T]] extends infer T_5 extends keyof (Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "field" | "operation"> & {
    field: import("@kbn/config-schema").Type<string | undefined>;
    operation: import("@kbn/config-schema").Type<"count">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_8 extends keyof T ? { [P_1 in T_8]: T[P_1]; } : never)]: T[K]; }) ? { [P_2 in T_5]: (Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "field" | "operation"> & {
    field: import("@kbn/config-schema").Type<string | undefined>;
    operation: import("@kbn/config-schema").Type<"count">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_6 extends keyof T ? { [P_1 in T_6]: T[P_1]; } : never)]: T[K]; })[P_2]; } : never)]: TypeOf<(Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "field" | "operation"> & {
    field: import("@kbn/config-schema").Type<string | undefined>;
    operation: import("@kbn/config-schema").Type<"count">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_9 extends keyof T ? { [P_1 in T_9]: T[P_1]; } : never)]: T[K]; })[K_2]>; }> | Readonly<{ [K_3 in keyof ((Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"unique_count">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_11 extends keyof T ? { [P_1 in T_11]: T[P_1]; } : never)]: T[K]; } extends infer T_10 extends Props ? { [Key_3 in keyof T_10]: undefined extends TypeOf<T_10[Key_3]> ? Key_3 : never; } : never)[Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"field", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T> | Exclude<"time_shift", keyof T> | Exclude<"empty_as_null", keyof T> | { [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T]] extends infer T_9 extends keyof (Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"unique_count">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_12 extends keyof T ? { [P_1 in T_12]: T[P_1]; } : never)]: T[K]; }) ? { [P_3 in T_9]: (Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"unique_count">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_10 extends keyof T ? { [P_1 in T_10]: T[P_1]; } : never)]: T[K]; })[P_3]; } : never)]?: TypeOf<(Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"unique_count">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_13 extends keyof T ? { [P_1 in T_13]: T[P_1]; } : never)]: T[K]; })[K_3]> | undefined; } & { [K_4 in keyof ((Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"unique_count">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_15 extends keyof T ? { [P_1 in T_15]: T[P_1]; } : never)]: T[K]; } extends infer T_14 extends Props ? { [Key_4 in keyof T_14]: undefined extends TypeOf<T_14[Key_4]> ? never : Key_4; } : never)[Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"field", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T> | Exclude<"time_shift", keyof T> | Exclude<"empty_as_null", keyof T> | { [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T]] extends infer T_13 extends keyof (Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"unique_count">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_16 extends keyof T ? { [P_1 in T_16]: T[P_1]; } : never)]: T[K]; }) ? { [P_4 in T_13]: (Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"unique_count">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_14 extends keyof T ? { [P_1 in T_14]: T[P_1]; } : never)]: T[K]; })[P_4]; } : never)]: TypeOf<(Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"unique_count">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_17 extends keyof T ? { [P_1 in T_17]: T[P_1]; } : never)]: T[K]; })[K_4]>; }> | Readonly<{ [K_5 in keyof ((Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"min" | "max" | "average" | "median" | "standard_deviation">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_19 extends keyof T ? { [P_1 in T_19]: T[P_1]; } : never)]: T[K]; } extends infer T_18 extends Props ? { [Key_5 in keyof T_18]: undefined extends TypeOf<T_18[Key_5]> ? Key_5 : never; } : never)[Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"field", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T> | Exclude<"time_shift", keyof T> | { [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T]] extends infer T_17 extends keyof (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"min" | "max" | "average" | "median" | "standard_deviation">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_20 extends keyof T ? { [P_1 in T_20]: T[P_1]; } : never)]: T[K]; }) ? { [P_5 in T_17]: (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"min" | "max" | "average" | "median" | "standard_deviation">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_18 extends keyof T ? { [P_1 in T_18]: T[P_1]; } : never)]: T[K]; })[P_5]; } : never)]?: TypeOf<(Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"min" | "max" | "average" | "median" | "standard_deviation">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_21 extends keyof T ? { [P_1 in T_21]: T[P_1]; } : never)]: T[K]; })[K_5]> | undefined; } & { [K_6 in keyof ((Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"min" | "max" | "average" | "median" | "standard_deviation">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_23 extends keyof T ? { [P_1 in T_23]: T[P_1]; } : never)]: T[K]; } extends infer T_22 extends Props ? { [Key_6 in keyof T_22]: undefined extends TypeOf<T_22[Key_6]> ? never : Key_6; } : never)[Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"field", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T> | Exclude<"time_shift", keyof T> | { [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T]] extends infer T_21 extends keyof (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"min" | "max" | "average" | "median" | "standard_deviation">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_24 extends keyof T ? { [P_1 in T_24]: T[P_1]; } : never)]: T[K]; }) ? { [P_6 in T_21]: (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"min" | "max" | "average" | "median" | "standard_deviation">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_22 extends keyof T ? { [P_1 in T_22]: T[P_1]; } : never)]: T[K]; })[P_6]; } : never)]: TypeOf<(Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"min" | "max" | "average" | "median" | "standard_deviation">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_25 extends keyof T ? { [P_1 in T_25]: T[P_1]; } : never)]: T[K]; })[K_6]>; }> | Readonly<{ [K_7 in keyof ((Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"sum">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_27 extends keyof T ? { [P_1 in T_27]: T[P_1]; } : never)]: T[K]; } extends infer T_26 extends Props ? { [Key_7 in keyof T_26]: undefined extends TypeOf<T_26[Key_7]> ? Key_7 : never; } : never)[Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"field", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T> | Exclude<"time_shift", keyof T> | Exclude<"empty_as_null", keyof T> | { [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T]] extends infer T_25 extends keyof (Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"sum">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_28 extends keyof T ? { [P_1 in T_28]: T[P_1]; } : never)]: T[K]; }) ? { [P_7 in T_25]: (Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"sum">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_26 extends keyof T ? { [P_1 in T_26]: T[P_1]; } : never)]: T[K]; })[P_7]; } : never)]?: TypeOf<(Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"sum">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_29 extends keyof T ? { [P_1 in T_29]: T[P_1]; } : never)]: T[K]; })[K_7]> | undefined; } & { [K_8 in keyof ((Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"sum">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_31 extends keyof T ? { [P_1 in T_31]: T[P_1]; } : never)]: T[K]; } extends infer T_30 extends Props ? { [Key_8 in keyof T_30]: undefined extends TypeOf<T_30[Key_8]> ? never : Key_8; } : never)[Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"field", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T> | Exclude<"time_shift", keyof T> | Exclude<"empty_as_null", keyof T> | { [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T]] extends infer T_29 extends keyof (Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"sum">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_32 extends keyof T ? { [P_1 in T_32]: T[P_1]; } : never)]: T[K]; }) ? { [P_8 in T_29]: (Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"sum">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_30 extends keyof T ? { [P_1 in T_30]: T[P_1]; } : never)]: T[K]; })[P_8]; } : never)]: TypeOf<(Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"sum">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_33 extends keyof T ? { [P_1 in T_33]: T[P_1]; } : never)]: T[K]; })[K_8]>; }> | Readonly<{ [K_9 in keyof ((Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation" | "time_field" | "multi_value"> & {
    operation: import("@kbn/config-schema").Type<"last_value">;
    time_field: import("@kbn/config-schema").Type<string>;
    multi_value: import("@kbn/config-schema").Type<boolean>;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_35 extends keyof T ? { [P_1 in T_35]: T[P_1]; } : never)]: T[K]; } extends infer T_34 extends Props ? { [Key_9 in keyof T_34]: undefined extends TypeOf<T_34[Key_9]> ? Key_9 : never; } : never)[Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"field", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T> | Exclude<"time_shift", keyof T> | { [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] | Exclude<"time_field", keyof T> | Exclude<"multi_value", keyof T>] extends infer T_33 extends keyof (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation" | "time_field" | "multi_value"> & {
    operation: import("@kbn/config-schema").Type<"last_value">;
    time_field: import("@kbn/config-schema").Type<string>;
    multi_value: import("@kbn/config-schema").Type<boolean>;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_36 extends keyof T ? { [P_1 in T_36]: T[P_1]; } : never)]: T[K]; }) ? { [P_9 in T_33]: (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation" | "time_field" | "multi_value"> & {
    operation: import("@kbn/config-schema").Type<"last_value">;
    time_field: import("@kbn/config-schema").Type<string>;
    multi_value: import("@kbn/config-schema").Type<boolean>;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_34 extends keyof T ? { [P_1 in T_34]: T[P_1]; } : never)]: T[K]; })[P_9]; } : never)]?: TypeOf<(Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation" | "time_field" | "multi_value"> & {
    operation: import("@kbn/config-schema").Type<"last_value">;
    time_field: import("@kbn/config-schema").Type<string>;
    multi_value: import("@kbn/config-schema").Type<boolean>;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_37 extends keyof T ? { [P_1 in T_37]: T[P_1]; } : never)]: T[K]; })[K_9]> | undefined; } & { [K_10 in keyof ((Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation" | "time_field" | "multi_value"> & {
    operation: import("@kbn/config-schema").Type<"last_value">;
    time_field: import("@kbn/config-schema").Type<string>;
    multi_value: import("@kbn/config-schema").Type<boolean>;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_39 extends keyof T ? { [P_1 in T_39]: T[P_1]; } : never)]: T[K]; } extends infer T_38 extends Props ? { [Key_10 in keyof T_38]: undefined extends TypeOf<T_38[Key_10]> ? never : Key_10; } : never)[Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"field", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T> | Exclude<"time_shift", keyof T> | { [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] | Exclude<"time_field", keyof T> | Exclude<"multi_value", keyof T>] extends infer T_37 extends keyof (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation" | "time_field" | "multi_value"> & {
    operation: import("@kbn/config-schema").Type<"last_value">;
    time_field: import("@kbn/config-schema").Type<string>;
    multi_value: import("@kbn/config-schema").Type<boolean>;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_40 extends keyof T ? { [P_1 in T_40]: T[P_1]; } : never)]: T[K]; }) ? { [P_10 in T_37]: (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation" | "time_field" | "multi_value"> & {
    operation: import("@kbn/config-schema").Type<"last_value">;
    time_field: import("@kbn/config-schema").Type<string>;
    multi_value: import("@kbn/config-schema").Type<boolean>;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_38 extends keyof T ? { [P_1 in T_38]: T[P_1]; } : never)]: T[K]; })[P_10]; } : never)]: TypeOf<(Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation" | "time_field" | "multi_value"> & {
    operation: import("@kbn/config-schema").Type<"last_value">;
    time_field: import("@kbn/config-schema").Type<string>;
    multi_value: import("@kbn/config-schema").Type<boolean>;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_41 extends keyof T ? { [P_1 in T_41]: T[P_1]; } : never)]: T[K]; })[K_10]>; }> | Readonly<{ [K_11 in keyof ((Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "percentile" | "operation"> & {
    percentile: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"percentile">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_43 extends keyof T ? { [P_1 in T_43]: T[P_1]; } : never)]: T[K]; } extends infer T_42 extends Props ? { [Key_11 in keyof T_42]: undefined extends TypeOf<T_42[Key_11]> ? Key_11 : never; } : never)[Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"field", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T> | Exclude<"time_shift", keyof T> | { [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] | Exclude<"percentile", keyof T>] extends infer T_41 extends keyof (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "percentile" | "operation"> & {
    percentile: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"percentile">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_44 extends keyof T ? { [P_1 in T_44]: T[P_1]; } : never)]: T[K]; }) ? { [P_11 in T_41]: (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "percentile" | "operation"> & {
    percentile: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"percentile">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_42 extends keyof T ? { [P_1 in T_42]: T[P_1]; } : never)]: T[K]; })[P_11]; } : never)]?: TypeOf<(Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "percentile" | "operation"> & {
    percentile: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"percentile">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_45 extends keyof T ? { [P_1 in T_45]: T[P_1]; } : never)]: T[K]; })[K_11]> | undefined; } & { [K_12 in keyof ((Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "percentile" | "operation"> & {
    percentile: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"percentile">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_47 extends keyof T ? { [P_1 in T_47]: T[P_1]; } : never)]: T[K]; } extends infer T_46 extends Props ? { [Key_12 in keyof T_46]: undefined extends TypeOf<T_46[Key_12]> ? never : Key_12; } : never)[Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"field", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T> | Exclude<"time_shift", keyof T> | { [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] | Exclude<"percentile", keyof T>] extends infer T_45 extends keyof (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "percentile" | "operation"> & {
    percentile: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"percentile">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_48 extends keyof T ? { [P_1 in T_48]: T[P_1]; } : never)]: T[K]; }) ? { [P_12 in T_45]: (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "percentile" | "operation"> & {
    percentile: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"percentile">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_46 extends keyof T ? { [P_1 in T_46]: T[P_1]; } : never)]: T[K]; })[P_12]; } : never)]: TypeOf<(Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "percentile" | "operation"> & {
    percentile: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"percentile">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_49 extends keyof T ? { [P_1 in T_49]: T[P_1]; } : never)]: T[K]; })[K_12]>; }> | Readonly<{ [K_13 in keyof ((Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "rank" | "operation"> & {
    rank: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"percentile_rank">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_51 extends keyof T ? { [P_1 in T_51]: T[P_1]; } : never)]: T[K]; } extends infer T_50 extends Props ? { [Key_13 in keyof T_50]: undefined extends TypeOf<T_50[Key_13]> ? Key_13 : never; } : never)[Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"field", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T> | Exclude<"time_shift", keyof T> | { [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] | Exclude<"rank", keyof T>] extends infer T_49 extends keyof (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "rank" | "operation"> & {
    rank: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"percentile_rank">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_52 extends keyof T ? { [P_1 in T_52]: T[P_1]; } : never)]: T[K]; }) ? { [P_13 in T_49]: (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "rank" | "operation"> & {
    rank: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"percentile_rank">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_50 extends keyof T ? { [P_1 in T_50]: T[P_1]; } : never)]: T[K]; })[P_13]; } : never)]?: TypeOf<(Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "rank" | "operation"> & {
    rank: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"percentile_rank">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_53 extends keyof T ? { [P_1 in T_53]: T[P_1]; } : never)]: T[K]; })[K_13]> | undefined; } & { [K_14 in keyof ((Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "rank" | "operation"> & {
    rank: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"percentile_rank">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_55 extends keyof T ? { [P_1 in T_55]: T[P_1]; } : never)]: T[K]; } extends infer T_54 extends Props ? { [Key_14 in keyof T_54]: undefined extends TypeOf<T_54[Key_14]> ? never : Key_14; } : never)[Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"field", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T> | Exclude<"time_shift", keyof T> | { [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] | Exclude<"rank", keyof T>] extends infer T_53 extends keyof (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "rank" | "operation"> & {
    rank: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"percentile_rank">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_56 extends keyof T ? { [P_1 in T_56]: T[P_1]; } : never)]: T[K]; }) ? { [P_14 in T_53]: (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "rank" | "operation"> & {
    rank: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"percentile_rank">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_54 extends keyof T ? { [P_1 in T_54]: T[P_1]; } : never)]: T[K]; })[P_14]; } : never)]: TypeOf<(Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "rank" | "operation"> & {
    rank: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"percentile_rank">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_57 extends keyof T ? { [P_1 in T_57]: T[P_1]; } : never)]: T[K]; })[K_14]>; }> | Readonly<{ [K_15 in keyof ((Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "of" | "operation"> & {
    of: import("@kbn/config-schema").Type<Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        field?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        operation: "count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "unique_count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "min" | "max" | "average" | "median" | "standard_deviation";
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "sum";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "last_value";
        time_field: string;
        multi_value: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        percentile: number;
        operation: "percentile";
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        rank: number;
        operation: "percentile_rank";
    }>>;
    operation: import("@kbn/config-schema").Type<"differences">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_59 extends keyof T ? { [P_1 in T_59]: T[P_1]; } : never)]: T[K]; } extends infer T_58 extends Props ? { [Key_15 in keyof T_58]: undefined extends TypeOf<T_58[Key_15]> ? Key_15 : never; } : never)[Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T> | Exclude<"time_shift", keyof T> | { [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] | Exclude<"of", keyof T>] extends infer T_57 extends keyof (Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "of" | "operation"> & {
    of: import("@kbn/config-schema").Type<Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        field?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        operation: "count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "unique_count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "min" | "max" | "average" | "median" | "standard_deviation";
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "sum";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "last_value";
        time_field: string;
        multi_value: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        percentile: number;
        operation: "percentile";
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        rank: number;
        operation: "percentile_rank";
    }>>;
    operation: import("@kbn/config-schema").Type<"differences">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_60 extends keyof T ? { [P_1 in T_60]: T[P_1]; } : never)]: T[K]; }) ? { [P_15 in T_57]: (Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "of" | "operation"> & {
    of: import("@kbn/config-schema").Type<Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        field?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        operation: "count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "unique_count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "min" | "max" | "average" | "median" | "standard_deviation";
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "sum";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "last_value";
        time_field: string;
        multi_value: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        percentile: number;
        operation: "percentile";
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        rank: number;
        operation: "percentile_rank";
    }>>;
    operation: import("@kbn/config-schema").Type<"differences">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_58 extends keyof T ? { [P_1 in T_58]: T[P_1]; } : never)]: T[K]; })[P_15]; } : never)]?: TypeOf<(Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "of" | "operation"> & {
    of: import("@kbn/config-schema").Type<Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        field?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        operation: "count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "unique_count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "min" | "max" | "average" | "median" | "standard_deviation";
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "sum";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "last_value";
        time_field: string;
        multi_value: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        percentile: number;
        operation: "percentile";
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        rank: number;
        operation: "percentile_rank";
    }>>;
    operation: import("@kbn/config-schema").Type<"differences">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_61 extends keyof T ? { [P_1 in T_61]: T[P_1]; } : never)]: T[K]; })[K_15]> | undefined; } & { [K_16 in keyof ((Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "of" | "operation"> & {
    of: import("@kbn/config-schema").Type<Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        field?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        operation: "count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "unique_count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "min" | "max" | "average" | "median" | "standard_deviation";
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "sum";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "last_value";
        time_field: string;
        multi_value: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        percentile: number;
        operation: "percentile";
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        rank: number;
        operation: "percentile_rank";
    }>>;
    operation: import("@kbn/config-schema").Type<"differences">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_63 extends keyof T ? { [P_1 in T_63]: T[P_1]; } : never)]: T[K]; } extends infer T_62 extends Props ? { [Key_16 in keyof T_62]: undefined extends TypeOf<T_62[Key_16]> ? never : Key_16; } : never)[Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T> | Exclude<"time_shift", keyof T> | { [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] | Exclude<"of", keyof T>] extends infer T_61 extends keyof (Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "of" | "operation"> & {
    of: import("@kbn/config-schema").Type<Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        field?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        operation: "count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "unique_count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "min" | "max" | "average" | "median" | "standard_deviation";
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "sum";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "last_value";
        time_field: string;
        multi_value: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        percentile: number;
        operation: "percentile";
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        rank: number;
        operation: "percentile_rank";
    }>>;
    operation: import("@kbn/config-schema").Type<"differences">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_64 extends keyof T ? { [P_1 in T_64]: T[P_1]; } : never)]: T[K]; }) ? { [P_16 in T_61]: (Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "of" | "operation"> & {
    of: import("@kbn/config-schema").Type<Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        field?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        operation: "count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "unique_count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "min" | "max" | "average" | "median" | "standard_deviation";
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "sum";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "last_value";
        time_field: string;
        multi_value: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        percentile: number;
        operation: "percentile";
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        rank: number;
        operation: "percentile_rank";
    }>>;
    operation: import("@kbn/config-schema").Type<"differences">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_62 extends keyof T ? { [P_1 in T_62]: T[P_1]; } : never)]: T[K]; })[P_16]; } : never)]: TypeOf<(Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "of" | "operation"> & {
    of: import("@kbn/config-schema").Type<Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        field?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        operation: "count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "unique_count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "min" | "max" | "average" | "median" | "standard_deviation";
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "sum";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "last_value";
        time_field: string;
        multi_value: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        percentile: number;
        operation: "percentile";
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        rank: number;
        operation: "percentile_rank";
    }>>;
    operation: import("@kbn/config-schema").Type<"differences">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_65 extends keyof T ? { [P_1 in T_65]: T[P_1]; } : never)]: T[K]; })[K_16]>; }> | Readonly<{ [K_17 in keyof ((Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "of" | "window" | "operation"> & {
    of: import("@kbn/config-schema").Type<Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        field?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        operation: "count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "unique_count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "min" | "max" | "average" | "median" | "standard_deviation";
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "sum";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "last_value";
        time_field: string;
        multi_value: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        percentile: number;
        operation: "percentile";
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        rank: number;
        operation: "percentile_rank";
    }>>;
    window: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"moving_average">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_67 extends keyof T ? { [P_1 in T_67]: T[P_1]; } : never)]: T[K]; } extends infer T_66 extends Props ? { [Key_17 in keyof T_66]: undefined extends TypeOf<T_66[Key_17]> ? Key_17 : never; } : never)[Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T> | Exclude<"time_shift", keyof T> | { [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] | Exclude<"of", keyof T> | Exclude<"window", keyof T>] extends infer T_65 extends keyof (Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "of" | "window" | "operation"> & {
    of: import("@kbn/config-schema").Type<Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        field?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        operation: "count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "unique_count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "min" | "max" | "average" | "median" | "standard_deviation";
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "sum";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "last_value";
        time_field: string;
        multi_value: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        percentile: number;
        operation: "percentile";
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        rank: number;
        operation: "percentile_rank";
    }>>;
    window: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"moving_average">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_68 extends keyof T ? { [P_1 in T_68]: T[P_1]; } : never)]: T[K]; }) ? { [P_17 in T_65]: (Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "of" | "window" | "operation"> & {
    of: import("@kbn/config-schema").Type<Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        field?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        operation: "count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "unique_count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "min" | "max" | "average" | "median" | "standard_deviation";
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "sum";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "last_value";
        time_field: string;
        multi_value: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        percentile: number;
        operation: "percentile";
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        rank: number;
        operation: "percentile_rank";
    }>>;
    window: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"moving_average">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_66 extends keyof T ? { [P_1 in T_66]: T[P_1]; } : never)]: T[K]; })[P_17]; } : never)]?: TypeOf<(Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "of" | "window" | "operation"> & {
    of: import("@kbn/config-schema").Type<Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        field?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        operation: "count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "unique_count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "min" | "max" | "average" | "median" | "standard_deviation";
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "sum";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "last_value";
        time_field: string;
        multi_value: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        percentile: number;
        operation: "percentile";
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        rank: number;
        operation: "percentile_rank";
    }>>;
    window: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"moving_average">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_69 extends keyof T ? { [P_1 in T_69]: T[P_1]; } : never)]: T[K]; })[K_17]> | undefined; } & { [K_18 in keyof ((Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "of" | "window" | "operation"> & {
    of: import("@kbn/config-schema").Type<Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        field?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        operation: "count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "unique_count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "min" | "max" | "average" | "median" | "standard_deviation";
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "sum";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "last_value";
        time_field: string;
        multi_value: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        percentile: number;
        operation: "percentile";
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        rank: number;
        operation: "percentile_rank";
    }>>;
    window: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"moving_average">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_71 extends keyof T ? { [P_1 in T_71]: T[P_1]; } : never)]: T[K]; } extends infer T_70 extends Props ? { [Key_18 in keyof T_70]: undefined extends TypeOf<T_70[Key_18]> ? never : Key_18; } : never)[Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T> | Exclude<"time_shift", keyof T> | { [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] | Exclude<"of", keyof T> | Exclude<"window", keyof T>] extends infer T_69 extends keyof (Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "of" | "window" | "operation"> & {
    of: import("@kbn/config-schema").Type<Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        field?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        operation: "count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "unique_count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "min" | "max" | "average" | "median" | "standard_deviation";
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "sum";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "last_value";
        time_field: string;
        multi_value: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        percentile: number;
        operation: "percentile";
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        rank: number;
        operation: "percentile_rank";
    }>>;
    window: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"moving_average">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_72 extends keyof T ? { [P_1 in T_72]: T[P_1]; } : never)]: T[K]; }) ? { [P_18 in T_69]: (Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "of" | "window" | "operation"> & {
    of: import("@kbn/config-schema").Type<Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        field?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        operation: "count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "unique_count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "min" | "max" | "average" | "median" | "standard_deviation";
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "sum";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "last_value";
        time_field: string;
        multi_value: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        percentile: number;
        operation: "percentile";
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        rank: number;
        operation: "percentile_rank";
    }>>;
    window: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"moving_average">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_70 extends keyof T ? { [P_1 in T_70]: T[P_1]; } : never)]: T[K]; })[P_18]; } : never)]: TypeOf<(Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "of" | "window" | "operation"> & {
    of: import("@kbn/config-schema").Type<Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        field?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        operation: "count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "unique_count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "min" | "max" | "average" | "median" | "standard_deviation";
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "sum";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "last_value";
        time_field: string;
        multi_value: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        percentile: number;
        operation: "percentile";
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        label?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        rank: number;
        operation: "percentile_rank";
    }>>;
    window: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"moving_average">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_73 extends keyof T ? { [P_1 in T_73]: T[P_1]; } : never)]: T[K]; })[K_18]>; }> | Readonly<{ [K_19 in keyof ((Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"cumulative_sum">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_75 extends keyof T ? { [P_1 in T_75]: T[P_1]; } : never)]: T[K]; } extends infer T_74 extends Props ? { [Key_19 in keyof T_74]: undefined extends TypeOf<T_74[Key_19]> ? Key_19 : never; } : never)[Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"field", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T> | Exclude<"time_shift", keyof T> | { [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T]] extends infer T_73 extends keyof (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"cumulative_sum">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_76 extends keyof T ? { [P_1 in T_76]: T[P_1]; } : never)]: T[K]; }) ? { [P_19 in T_73]: (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"cumulative_sum">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_74 extends keyof T ? { [P_1 in T_74]: T[P_1]; } : never)]: T[K]; })[P_19]; } : never)]?: TypeOf<(Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"cumulative_sum">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_77 extends keyof T ? { [P_1 in T_77]: T[P_1]; } : never)]: T[K]; })[K_19]> | undefined; } & { [K_20 in keyof ((Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"cumulative_sum">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_79 extends keyof T ? { [P_1 in T_79]: T[P_1]; } : never)]: T[K]; } extends infer T_78 extends Props ? { [Key_20 in keyof T_78]: undefined extends TypeOf<T_78[Key_20]> ? never : Key_20; } : never)[Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"field", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T> | Exclude<"time_shift", keyof T> | { [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T]] extends infer T_77 extends keyof (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"cumulative_sum">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_80 extends keyof T ? { [P_1 in T_80]: T[P_1]; } : never)]: T[K]; }) ? { [P_20 in T_77]: (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"cumulative_sum">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_78 extends keyof T ? { [P_1 in T_78]: T[P_1]; } : never)]: T[K]; })[P_20]; } : never)]: TypeOf<(Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"cumulative_sum">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_81 extends keyof T ? { [P_1 in T_81]: T[P_1]; } : never)]: T[K]; })[K_20]>; }> | Readonly<{ [K_21 in keyof ((Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"counter_rate">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_83 extends keyof T ? { [P_1 in T_83]: T[P_1]; } : never)]: T[K]; } extends infer T_82 extends Props ? { [Key_21 in keyof T_82]: undefined extends TypeOf<T_82[Key_21]> ? Key_21 : never; } : never)[Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"field", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T> | Exclude<"time_shift", keyof T> | { [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T]] extends infer T_81 extends keyof (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"counter_rate">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_84 extends keyof T ? { [P_1 in T_84]: T[P_1]; } : never)]: T[K]; }) ? { [P_21 in T_81]: (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"counter_rate">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_82 extends keyof T ? { [P_1 in T_82]: T[P_1]; } : never)]: T[K]; })[P_21]; } : never)]?: TypeOf<(Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"counter_rate">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_85 extends keyof T ? { [P_1 in T_85]: T[P_1]; } : never)]: T[K]; })[K_21]> | undefined; } & { [K_22 in keyof ((Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"counter_rate">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_87 extends keyof T ? { [P_1 in T_87]: T[P_1]; } : never)]: T[K]; } extends infer T_86 extends Props ? { [Key_22 in keyof T_86]: undefined extends TypeOf<T_86[Key_22]> ? never : Key_22; } : never)[Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"field", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T> | Exclude<"time_shift", keyof T> | { [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T]] extends infer T_85 extends keyof (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"counter_rate">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_88 extends keyof T ? { [P_1 in T_88]: T[P_1]; } : never)]: T[K]; }) ? { [P_22 in T_85]: (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"counter_rate">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_86 extends keyof T ? { [P_1 in T_86]: T[P_1]; } : never)]: T[K]; })[P_22]; } : never)]: TypeOf<(Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"counter_rate">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_89 extends keyof T ? { [P_1 in T_89]: T[P_1]; } : never)]: T[K]; })[K_22]>; }> | Readonly<{ [K_23 in keyof ((Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "value" | "operation"> & {
    value: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"static_value">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_91 extends keyof T ? { [P_1 in T_91]: T[P_1]; } : never)]: T[K]; } extends infer T_90 extends Props ? { [Key_23 in keyof T_90]: undefined extends TypeOf<T_90[Key_23]> ? Key_23 : never; } : never)[{ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] | Exclude<"format", keyof T> | Exclude<"value", keyof T> | Exclude<"label", keyof T> | Exclude<"operation", keyof T>] extends infer T_89 extends keyof (Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "value" | "operation"> & {
    value: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"static_value">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_92 extends keyof T ? { [P_1 in T_92]: T[P_1]; } : never)]: T[K]; }) ? { [P_23 in T_89]: (Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "value" | "operation"> & {
    value: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"static_value">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_90 extends keyof T ? { [P_1 in T_90]: T[P_1]; } : never)]: T[K]; })[P_23]; } : never)]?: TypeOf<(Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "value" | "operation"> & {
    value: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"static_value">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_93 extends keyof T ? { [P_1 in T_93]: T[P_1]; } : never)]: T[K]; })[K_23]> | undefined; } & { [K_24 in keyof ((Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "value" | "operation"> & {
    value: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"static_value">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_95 extends keyof T ? { [P_1 in T_95]: T[P_1]; } : never)]: T[K]; } extends infer T_94 extends Props ? { [Key_24 in keyof T_94]: undefined extends TypeOf<T_94[Key_24]> ? never : Key_24; } : never)[{ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] | Exclude<"format", keyof T> | Exclude<"value", keyof T> | Exclude<"label", keyof T> | Exclude<"operation", keyof T>] extends infer T_93 extends keyof (Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "value" | "operation"> & {
    value: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"static_value">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_96 extends keyof T ? { [P_1 in T_96]: T[P_1]; } : never)]: T[K]; }) ? { [P_24 in T_93]: (Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "value" | "operation"> & {
    value: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"static_value">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_94 extends keyof T ? { [P_1 in T_94]: T[P_1]; } : never)]: T[K]; })[P_24]; } : never)]: TypeOf<(Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "value" | "operation"> & {
    value: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"static_value">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_97 extends keyof T ? { [P_1 in T_97]: T[P_1]; } : never)]: T[K]; })[K_24]>; }> | Readonly<{ [K_25 in keyof ((Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "formula" | "operation" | "time_scale" | "reduced_time_range"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    formula: import("@kbn/config-schema").Type<string>;
    operation: import("@kbn/config-schema").Type<"formula">;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_99 extends keyof T ? { [P_1 in T_99]: T[P_1]; } : never)]: T[K]; } extends infer T_98 extends Props ? { [Key_25 in keyof T_98]: undefined extends TypeOf<T_98[Key_25]> ? Key_25 : never; } : never)[{ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] | Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"formula", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T>] extends infer T_97 extends keyof (Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "formula" | "operation" | "time_scale" | "reduced_time_range"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    formula: import("@kbn/config-schema").Type<string>;
    operation: import("@kbn/config-schema").Type<"formula">;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_100 extends keyof T ? { [P_1 in T_100]: T[P_1]; } : never)]: T[K]; }) ? { [P_25 in T_97]: (Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "formula" | "operation" | "time_scale" | "reduced_time_range"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    formula: import("@kbn/config-schema").Type<string>;
    operation: import("@kbn/config-schema").Type<"formula">;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_98 extends keyof T ? { [P_1 in T_98]: T[P_1]; } : never)]: T[K]; })[P_25]; } : never)]?: TypeOf<(Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "formula" | "operation" | "time_scale" | "reduced_time_range"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    formula: import("@kbn/config-schema").Type<string>;
    operation: import("@kbn/config-schema").Type<"formula">;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_101 extends keyof T ? { [P_1 in T_101]: T[P_1]; } : never)]: T[K]; })[K_25]> | undefined; } & { [K_26 in keyof ((Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "formula" | "operation" | "time_scale" | "reduced_time_range"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    formula: import("@kbn/config-schema").Type<string>;
    operation: import("@kbn/config-schema").Type<"formula">;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_103 extends keyof T ? { [P_1 in T_103]: T[P_1]; } : never)]: T[K]; } extends infer T_102 extends Props ? { [Key_26 in keyof T_102]: undefined extends TypeOf<T_102[Key_26]> ? never : Key_26; } : never)[{ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] | Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"formula", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T>] extends infer T_101 extends keyof (Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "formula" | "operation" | "time_scale" | "reduced_time_range"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    formula: import("@kbn/config-schema").Type<string>;
    operation: import("@kbn/config-schema").Type<"formula">;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_104 extends keyof T ? { [P_1 in T_104]: T[P_1]; } : never)]: T[K]; }) ? { [P_26 in T_101]: (Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "formula" | "operation" | "time_scale" | "reduced_time_range"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    formula: import("@kbn/config-schema").Type<string>;
    operation: import("@kbn/config-schema").Type<"formula">;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_102 extends keyof T ? { [P_1 in T_102]: T[P_1]; } : never)]: T[K]; })[P_26]; } : never)]: TypeOf<(Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "formula" | "operation" | "time_scale" | "reduced_time_range"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    formula: import("@kbn/config-schema").Type<string>;
    operation: import("@kbn/config-schema").Type<"formula">;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_105 extends keyof T ? { [P_1 in T_105]: T[P_1]; } : never)]: T[K]; })[K_26]>; }>>;
export declare function mergeAllMetricsWithChartDimensionSchemaWithStaticOps<T extends Props>(baseSchema: T, context: string): import("@kbn/config-schema").Type<Readonly<{ [K_1 in keyof ((Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "field" | "operation"> & {
    field: import("@kbn/config-schema").Type<string | undefined>;
    operation: import("@kbn/config-schema").Type<"count">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_3 extends keyof T ? { [P_1 in T_3]: T[P_1]; } : never)]: T[K]; } extends infer T_2 extends Props ? { [Key in keyof T_2]: undefined extends TypeOf<T_2[Key]> ? Key : never; } : never)[Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"field", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T> | Exclude<"time_shift", keyof T> | Exclude<"empty_as_null", keyof T> | { [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T]] extends infer T_1 extends keyof (Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "field" | "operation"> & {
    field: import("@kbn/config-schema").Type<string | undefined>;
    operation: import("@kbn/config-schema").Type<"count">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_4 extends keyof T ? { [P_1 in T_4]: T[P_1]; } : never)]: T[K]; }) ? { [P in T_1]: (Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "field" | "operation"> & {
    field: import("@kbn/config-schema").Type<string | undefined>;
    operation: import("@kbn/config-schema").Type<"count">;
}, keyof T> & { [K in keyof ({ [Key in keyof T]: undefined extends T[Key] ? never : null extends T[Key] ? never : Key; }[keyof T] extends infer T_2 extends keyof T ? { [P_2 in T_2]: T[P_2]; } : never)]: T[K]; })[P]; } : never)]?: TypeOf<(Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "field" | "operation"> & {
    field: import("@kbn/config-schema").Type<string | undefined>;
    operation: import("@kbn/config-schema").Type<"count">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_5 extends keyof T ? { [P_1 in T_5]: T[P_1]; } : never)]: T[K]; })[K_1]> | undefined; } & { [K_2 in keyof ((Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "field" | "operation"> & {
    field: import("@kbn/config-schema").Type<string | undefined>;
    operation: import("@kbn/config-schema").Type<"count">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_7 extends keyof T ? { [P_1 in T_7]: T[P_1]; } : never)]: T[K]; } extends infer T_6 extends Props ? { [Key_2 in keyof T_6]: undefined extends TypeOf<T_6[Key_2]> ? never : Key_2; } : never)[Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"field", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T> | Exclude<"time_shift", keyof T> | Exclude<"empty_as_null", keyof T> | { [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T]] extends infer T_5 extends keyof (Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "field" | "operation"> & {
    field: import("@kbn/config-schema").Type<string | undefined>;
    operation: import("@kbn/config-schema").Type<"count">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_8 extends keyof T ? { [P_1 in T_8]: T[P_1]; } : never)]: T[K]; }) ? { [P_2 in T_5]: (Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "field" | "operation"> & {
    field: import("@kbn/config-schema").Type<string | undefined>;
    operation: import("@kbn/config-schema").Type<"count">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_6 extends keyof T ? { [P_1 in T_6]: T[P_1]; } : never)]: T[K]; })[P_2]; } : never)]: TypeOf<(Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "field" | "operation"> & {
    field: import("@kbn/config-schema").Type<string | undefined>;
    operation: import("@kbn/config-schema").Type<"count">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_9 extends keyof T ? { [P_1 in T_9]: T[P_1]; } : never)]: T[K]; })[K_2]>; }> | Readonly<{ [K_3 in keyof ((Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"unique_count">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_11 extends keyof T ? { [P_1 in T_11]: T[P_1]; } : never)]: T[K]; } extends infer T_10 extends Props ? { [Key_3 in keyof T_10]: undefined extends TypeOf<T_10[Key_3]> ? Key_3 : never; } : never)[Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"field", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T> | Exclude<"time_shift", keyof T> | Exclude<"empty_as_null", keyof T> | { [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T]] extends infer T_9 extends keyof (Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"unique_count">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_12 extends keyof T ? { [P_1 in T_12]: T[P_1]; } : never)]: T[K]; }) ? { [P_3 in T_9]: (Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"unique_count">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_10 extends keyof T ? { [P_1 in T_10]: T[P_1]; } : never)]: T[K]; })[P_3]; } : never)]?: TypeOf<(Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"unique_count">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_13 extends keyof T ? { [P_1 in T_13]: T[P_1]; } : never)]: T[K]; })[K_3]> | undefined; } & { [K_4 in keyof ((Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"unique_count">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_15 extends keyof T ? { [P_1 in T_15]: T[P_1]; } : never)]: T[K]; } extends infer T_14 extends Props ? { [Key_4 in keyof T_14]: undefined extends TypeOf<T_14[Key_4]> ? never : Key_4; } : never)[Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"field", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T> | Exclude<"time_shift", keyof T> | Exclude<"empty_as_null", keyof T> | { [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T]] extends infer T_13 extends keyof (Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"unique_count">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_16 extends keyof T ? { [P_1 in T_16]: T[P_1]; } : never)]: T[K]; }) ? { [P_4 in T_13]: (Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"unique_count">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_14 extends keyof T ? { [P_1 in T_14]: T[P_1]; } : never)]: T[K]; })[P_4]; } : never)]: TypeOf<(Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"unique_count">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_17 extends keyof T ? { [P_1 in T_17]: T[P_1]; } : never)]: T[K]; })[K_4]>; }> | Readonly<{ [K_5 in keyof ((Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"min" | "max" | "average" | "median" | "standard_deviation">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_19 extends keyof T ? { [P_1 in T_19]: T[P_1]; } : never)]: T[K]; } extends infer T_18 extends Props ? { [Key_5 in keyof T_18]: undefined extends TypeOf<T_18[Key_5]> ? Key_5 : never; } : never)[Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"field", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T> | Exclude<"time_shift", keyof T> | { [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T]] extends infer T_17 extends keyof (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"min" | "max" | "average" | "median" | "standard_deviation">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_20 extends keyof T ? { [P_1 in T_20]: T[P_1]; } : never)]: T[K]; }) ? { [P_5 in T_17]: (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"min" | "max" | "average" | "median" | "standard_deviation">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_18 extends keyof T ? { [P_1 in T_18]: T[P_1]; } : never)]: T[K]; })[P_5]; } : never)]?: TypeOf<(Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"min" | "max" | "average" | "median" | "standard_deviation">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_21 extends keyof T ? { [P_1 in T_21]: T[P_1]; } : never)]: T[K]; })[K_5]> | undefined; } & { [K_6 in keyof ((Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"min" | "max" | "average" | "median" | "standard_deviation">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_23 extends keyof T ? { [P_1 in T_23]: T[P_1]; } : never)]: T[K]; } extends infer T_22 extends Props ? { [Key_6 in keyof T_22]: undefined extends TypeOf<T_22[Key_6]> ? never : Key_6; } : never)[Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"field", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T> | Exclude<"time_shift", keyof T> | { [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T]] extends infer T_21 extends keyof (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"min" | "max" | "average" | "median" | "standard_deviation">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_24 extends keyof T ? { [P_1 in T_24]: T[P_1]; } : never)]: T[K]; }) ? { [P_6 in T_21]: (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"min" | "max" | "average" | "median" | "standard_deviation">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_22 extends keyof T ? { [P_1 in T_22]: T[P_1]; } : never)]: T[K]; })[P_6]; } : never)]: TypeOf<(Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"min" | "max" | "average" | "median" | "standard_deviation">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_25 extends keyof T ? { [P_1 in T_25]: T[P_1]; } : never)]: T[K]; })[K_6]>; }> | Readonly<{ [K_7 in keyof ((Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"sum">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_27 extends keyof T ? { [P_1 in T_27]: T[P_1]; } : never)]: T[K]; } extends infer T_26 extends Props ? { [Key_7 in keyof T_26]: undefined extends TypeOf<T_26[Key_7]> ? Key_7 : never; } : never)[Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"field", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T> | Exclude<"time_shift", keyof T> | Exclude<"empty_as_null", keyof T> | { [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T]] extends infer T_25 extends keyof (Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"sum">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_28 extends keyof T ? { [P_1 in T_28]: T[P_1]; } : never)]: T[K]; }) ? { [P_7 in T_25]: (Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"sum">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_26 extends keyof T ? { [P_1 in T_26]: T[P_1]; } : never)]: T[K]; })[P_7]; } : never)]?: TypeOf<(Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"sum">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_29 extends keyof T ? { [P_1 in T_29]: T[P_1]; } : never)]: T[K]; })[K_7]> | undefined; } & { [K_8 in keyof ((Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"sum">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_31 extends keyof T ? { [P_1 in T_31]: T[P_1]; } : never)]: T[K]; } extends infer T_30 extends Props ? { [Key_8 in keyof T_30]: undefined extends TypeOf<T_30[Key_8]> ? never : Key_8; } : never)[Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"field", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T> | Exclude<"time_shift", keyof T> | Exclude<"empty_as_null", keyof T> | { [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T]] extends infer T_29 extends keyof (Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"sum">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_32 extends keyof T ? { [P_1 in T_32]: T[P_1]; } : never)]: T[K]; }) ? { [P_8 in T_29]: (Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"sum">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_30 extends keyof T ? { [P_1 in T_30]: T[P_1]; } : never)]: T[K]; })[P_8]; } : never)]: TypeOf<(Omit<Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"sum">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_33 extends keyof T ? { [P_1 in T_33]: T[P_1]; } : never)]: T[K]; })[K_8]>; }> | Readonly<{ [K_9 in keyof ((Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation" | "time_field" | "multi_value"> & {
    operation: import("@kbn/config-schema").Type<"last_value">;
    time_field: import("@kbn/config-schema").Type<string>;
    multi_value: import("@kbn/config-schema").Type<boolean>;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_35 extends keyof T ? { [P_1 in T_35]: T[P_1]; } : never)]: T[K]; } extends infer T_34 extends Props ? { [Key_9 in keyof T_34]: undefined extends TypeOf<T_34[Key_9]> ? Key_9 : never; } : never)[Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"field", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T> | Exclude<"time_shift", keyof T> | { [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] | Exclude<"time_field", keyof T> | Exclude<"multi_value", keyof T>] extends infer T_33 extends keyof (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation" | "time_field" | "multi_value"> & {
    operation: import("@kbn/config-schema").Type<"last_value">;
    time_field: import("@kbn/config-schema").Type<string>;
    multi_value: import("@kbn/config-schema").Type<boolean>;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_36 extends keyof T ? { [P_1 in T_36]: T[P_1]; } : never)]: T[K]; }) ? { [P_9 in T_33]: (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation" | "time_field" | "multi_value"> & {
    operation: import("@kbn/config-schema").Type<"last_value">;
    time_field: import("@kbn/config-schema").Type<string>;
    multi_value: import("@kbn/config-schema").Type<boolean>;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_34 extends keyof T ? { [P_1 in T_34]: T[P_1]; } : never)]: T[K]; })[P_9]; } : never)]?: TypeOf<(Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation" | "time_field" | "multi_value"> & {
    operation: import("@kbn/config-schema").Type<"last_value">;
    time_field: import("@kbn/config-schema").Type<string>;
    multi_value: import("@kbn/config-schema").Type<boolean>;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_37 extends keyof T ? { [P_1 in T_37]: T[P_1]; } : never)]: T[K]; })[K_9]> | undefined; } & { [K_10 in keyof ((Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation" | "time_field" | "multi_value"> & {
    operation: import("@kbn/config-schema").Type<"last_value">;
    time_field: import("@kbn/config-schema").Type<string>;
    multi_value: import("@kbn/config-schema").Type<boolean>;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_39 extends keyof T ? { [P_1 in T_39]: T[P_1]; } : never)]: T[K]; } extends infer T_38 extends Props ? { [Key_10 in keyof T_38]: undefined extends TypeOf<T_38[Key_10]> ? never : Key_10; } : never)[Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"field", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T> | Exclude<"time_shift", keyof T> | { [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] | Exclude<"time_field", keyof T> | Exclude<"multi_value", keyof T>] extends infer T_37 extends keyof (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation" | "time_field" | "multi_value"> & {
    operation: import("@kbn/config-schema").Type<"last_value">;
    time_field: import("@kbn/config-schema").Type<string>;
    multi_value: import("@kbn/config-schema").Type<boolean>;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_40 extends keyof T ? { [P_1 in T_40]: T[P_1]; } : never)]: T[K]; }) ? { [P_10 in T_37]: (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation" | "time_field" | "multi_value"> & {
    operation: import("@kbn/config-schema").Type<"last_value">;
    time_field: import("@kbn/config-schema").Type<string>;
    multi_value: import("@kbn/config-schema").Type<boolean>;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_38 extends keyof T ? { [P_1 in T_38]: T[P_1]; } : never)]: T[K]; })[P_10]; } : never)]: TypeOf<(Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation" | "time_field" | "multi_value"> & {
    operation: import("@kbn/config-schema").Type<"last_value">;
    time_field: import("@kbn/config-schema").Type<string>;
    multi_value: import("@kbn/config-schema").Type<boolean>;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_41 extends keyof T ? { [P_1 in T_41]: T[P_1]; } : never)]: T[K]; })[K_10]>; }> | Readonly<{ [K_11 in keyof ((Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "percentile" | "operation"> & {
    percentile: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"percentile">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_43 extends keyof T ? { [P_1 in T_43]: T[P_1]; } : never)]: T[K]; } extends infer T_42 extends Props ? { [Key_11 in keyof T_42]: undefined extends TypeOf<T_42[Key_11]> ? Key_11 : never; } : never)[Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"field", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T> | Exclude<"time_shift", keyof T> | { [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] | Exclude<"percentile", keyof T>] extends infer T_41 extends keyof (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "percentile" | "operation"> & {
    percentile: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"percentile">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_44 extends keyof T ? { [P_1 in T_44]: T[P_1]; } : never)]: T[K]; }) ? { [P_11 in T_41]: (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "percentile" | "operation"> & {
    percentile: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"percentile">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_42 extends keyof T ? { [P_1 in T_42]: T[P_1]; } : never)]: T[K]; })[P_11]; } : never)]?: TypeOf<(Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "percentile" | "operation"> & {
    percentile: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"percentile">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_45 extends keyof T ? { [P_1 in T_45]: T[P_1]; } : never)]: T[K]; })[K_11]> | undefined; } & { [K_12 in keyof ((Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "percentile" | "operation"> & {
    percentile: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"percentile">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_47 extends keyof T ? { [P_1 in T_47]: T[P_1]; } : never)]: T[K]; } extends infer T_46 extends Props ? { [Key_12 in keyof T_46]: undefined extends TypeOf<T_46[Key_12]> ? never : Key_12; } : never)[Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"field", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T> | Exclude<"time_shift", keyof T> | { [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] | Exclude<"percentile", keyof T>] extends infer T_45 extends keyof (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "percentile" | "operation"> & {
    percentile: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"percentile">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_48 extends keyof T ? { [P_1 in T_48]: T[P_1]; } : never)]: T[K]; }) ? { [P_12 in T_45]: (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "percentile" | "operation"> & {
    percentile: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"percentile">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_46 extends keyof T ? { [P_1 in T_46]: T[P_1]; } : never)]: T[K]; })[P_12]; } : never)]: TypeOf<(Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "percentile" | "operation"> & {
    percentile: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"percentile">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_49 extends keyof T ? { [P_1 in T_49]: T[P_1]; } : never)]: T[K]; })[K_12]>; }> | Readonly<{ [K_13 in keyof ((Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "rank" | "operation"> & {
    rank: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"percentile_rank">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_51 extends keyof T ? { [P_1 in T_51]: T[P_1]; } : never)]: T[K]; } extends infer T_50 extends Props ? { [Key_13 in keyof T_50]: undefined extends TypeOf<T_50[Key_13]> ? Key_13 : never; } : never)[Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"field", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T> | Exclude<"time_shift", keyof T> | { [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] | Exclude<"rank", keyof T>] extends infer T_49 extends keyof (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "rank" | "operation"> & {
    rank: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"percentile_rank">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_52 extends keyof T ? { [P_1 in T_52]: T[P_1]; } : never)]: T[K]; }) ? { [P_13 in T_49]: (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "rank" | "operation"> & {
    rank: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"percentile_rank">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_50 extends keyof T ? { [P_1 in T_50]: T[P_1]; } : never)]: T[K]; })[P_13]; } : never)]?: TypeOf<(Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "rank" | "operation"> & {
    rank: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"percentile_rank">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_53 extends keyof T ? { [P_1 in T_53]: T[P_1]; } : never)]: T[K]; })[K_13]> | undefined; } & { [K_14 in keyof ((Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "rank" | "operation"> & {
    rank: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"percentile_rank">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_55 extends keyof T ? { [P_1 in T_55]: T[P_1]; } : never)]: T[K]; } extends infer T_54 extends Props ? { [Key_14 in keyof T_54]: undefined extends TypeOf<T_54[Key_14]> ? never : Key_14; } : never)[Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"field", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T> | Exclude<"time_shift", keyof T> | { [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] | Exclude<"rank", keyof T>] extends infer T_53 extends keyof (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "rank" | "operation"> & {
    rank: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"percentile_rank">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_56 extends keyof T ? { [P_1 in T_56]: T[P_1]; } : never)]: T[K]; }) ? { [P_14 in T_53]: (Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "rank" | "operation"> & {
    rank: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"percentile_rank">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_54 extends keyof T ? { [P_1 in T_54]: T[P_1]; } : never)]: T[K]; })[P_14]; } : never)]: TypeOf<(Omit<Omit<Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "rank" | "operation"> & {
    rank: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"percentile_rank">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_57 extends keyof T ? { [P_1 in T_57]: T[P_1]; } : never)]: T[K]; })[K_14]>; }> | Readonly<{ [K_15 in keyof ((Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "value" | "operation"> & {
    value: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"static_value">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_59 extends keyof T ? { [P_1 in T_59]: T[P_1]; } : never)]: T[K]; } extends infer T_58 extends Props ? { [Key_15 in keyof T_58]: undefined extends TypeOf<T_58[Key_15]> ? Key_15 : never; } : never)[{ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] | Exclude<"format", keyof T> | Exclude<"value", keyof T> | Exclude<"label", keyof T> | Exclude<"operation", keyof T>] extends infer T_57 extends keyof (Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "value" | "operation"> & {
    value: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"static_value">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_60 extends keyof T ? { [P_1 in T_60]: T[P_1]; } : never)]: T[K]; }) ? { [P_15 in T_57]: (Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "value" | "operation"> & {
    value: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"static_value">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_58 extends keyof T ? { [P_1 in T_58]: T[P_1]; } : never)]: T[K]; })[P_15]; } : never)]?: TypeOf<(Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "value" | "operation"> & {
    value: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"static_value">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_61 extends keyof T ? { [P_1 in T_61]: T[P_1]; } : never)]: T[K]; })[K_15]> | undefined; } & { [K_16 in keyof ((Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "value" | "operation"> & {
    value: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"static_value">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_63 extends keyof T ? { [P_1 in T_63]: T[P_1]; } : never)]: T[K]; } extends infer T_62 extends Props ? { [Key_16 in keyof T_62]: undefined extends TypeOf<T_62[Key_16]> ? never : Key_16; } : never)[{ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] | Exclude<"format", keyof T> | Exclude<"value", keyof T> | Exclude<"label", keyof T> | Exclude<"operation", keyof T>] extends infer T_61 extends keyof (Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "value" | "operation"> & {
    value: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"static_value">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_64 extends keyof T ? { [P_1 in T_64]: T[P_1]; } : never)]: T[K]; }) ? { [P_16 in T_61]: (Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "value" | "operation"> & {
    value: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"static_value">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_62 extends keyof T ? { [P_1 in T_62]: T[P_1]; } : never)]: T[K]; })[P_16]; } : never)]: TypeOf<(Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "value" | "operation"> & {
    value: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"static_value">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_65 extends keyof T ? { [P_1 in T_65]: T[P_1]; } : never)]: T[K]; })[K_16]>; }> | Readonly<{ [K_17 in keyof ((Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "formula" | "operation" | "time_scale" | "reduced_time_range"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    formula: import("@kbn/config-schema").Type<string>;
    operation: import("@kbn/config-schema").Type<"formula">;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_67 extends keyof T ? { [P_1 in T_67]: T[P_1]; } : never)]: T[K]; } extends infer T_66 extends Props ? { [Key_17 in keyof T_66]: undefined extends TypeOf<T_66[Key_17]> ? Key_17 : never; } : never)[{ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] | Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"formula", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T>] extends infer T_65 extends keyof (Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "formula" | "operation" | "time_scale" | "reduced_time_range"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    formula: import("@kbn/config-schema").Type<string>;
    operation: import("@kbn/config-schema").Type<"formula">;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_68 extends keyof T ? { [P_1 in T_68]: T[P_1]; } : never)]: T[K]; }) ? { [P_17 in T_65]: (Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "formula" | "operation" | "time_scale" | "reduced_time_range"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    formula: import("@kbn/config-schema").Type<string>;
    operation: import("@kbn/config-schema").Type<"formula">;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_66 extends keyof T ? { [P_1 in T_66]: T[P_1]; } : never)]: T[K]; })[P_17]; } : never)]?: TypeOf<(Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "formula" | "operation" | "time_scale" | "reduced_time_range"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    formula: import("@kbn/config-schema").Type<string>;
    operation: import("@kbn/config-schema").Type<"formula">;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_69 extends keyof T ? { [P_1 in T_69]: T[P_1]; } : never)]: T[K]; })[K_17]> | undefined; } & { [K_18 in keyof ((Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "formula" | "operation" | "time_scale" | "reduced_time_range"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    formula: import("@kbn/config-schema").Type<string>;
    operation: import("@kbn/config-schema").Type<"formula">;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_71 extends keyof T ? { [P_1 in T_71]: T[P_1]; } : never)]: T[K]; } extends infer T_70 extends Props ? { [Key_18 in keyof T_70]: undefined extends TypeOf<T_70[Key_18]> ? never : Key_18; } : never)[{ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] | Exclude<"filter", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"formula", keyof T> | Exclude<"operation", keyof T> | Exclude<"time_scale", keyof T> | Exclude<"reduced_time_range", keyof T>] extends infer T_69 extends keyof (Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "formula" | "operation" | "time_scale" | "reduced_time_range"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    formula: import("@kbn/config-schema").Type<string>;
    operation: import("@kbn/config-schema").Type<"formula">;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_72 extends keyof T ? { [P_1 in T_72]: T[P_1]; } : never)]: T[K]; }) ? { [P_18 in T_69]: (Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "formula" | "operation" | "time_scale" | "reduced_time_range"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    formula: import("@kbn/config-schema").Type<string>;
    operation: import("@kbn/config-schema").Type<"formula">;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_70 extends keyof T ? { [P_1 in T_70]: T[P_1]; } : never)]: T[K]; })[P_18]; } : never)]: TypeOf<(Omit<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "formula" | "operation" | "time_scale" | "reduced_time_range"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    formula: import("@kbn/config-schema").Type<string>;
    operation: import("@kbn/config-schema").Type<"formula">;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_73 extends keyof T ? { [P_1 in T_73]: T[P_1]; } : never)]: T[K]; })[K_18]>; }>>;
export declare function mergeAllBucketsWithChartDimensionSchema<T extends Props>(baseSchema: T, context: string): import("@kbn/config-schema").Type<Readonly<{ [K_1 in keyof ((Omit<{
    field: import("@kbn/config-schema").Type<string>;
    suggested_interval: import("@kbn/config-schema").Type<string>;
    use_original_time_range: import("@kbn/config-schema").Type<boolean>;
    include_empty_rows: import("@kbn/config-schema").Type<boolean>;
    drop_partial_intervals: import("@kbn/config-schema").Type<boolean | undefined>;
    label: import("@kbn/config-schema").Type<string | undefined>;
    operation: import("@kbn/config-schema").Type<"date_histogram">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_3 extends keyof T ? { [P_1 in T_3]: T[P_1]; } : never)]: T[K]; } extends infer T_2 extends Props ? { [Key in keyof T_2]: undefined extends TypeOf<T_2[Key]> ? Key : never; } : never)[Exclude<"label", keyof T> | Exclude<"field", keyof T> | Exclude<"operation", keyof T> | Exclude<"suggested_interval", keyof T> | Exclude<"use_original_time_range", keyof T> | Exclude<"include_empty_rows", keyof T> | Exclude<"drop_partial_intervals", keyof T> | { [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T]] extends infer T_1 extends keyof (Omit<{
    field: import("@kbn/config-schema").Type<string>;
    suggested_interval: import("@kbn/config-schema").Type<string>;
    use_original_time_range: import("@kbn/config-schema").Type<boolean>;
    include_empty_rows: import("@kbn/config-schema").Type<boolean>;
    drop_partial_intervals: import("@kbn/config-schema").Type<boolean | undefined>;
    label: import("@kbn/config-schema").Type<string | undefined>;
    operation: import("@kbn/config-schema").Type<"date_histogram">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_4 extends keyof T ? { [P_1 in T_4]: T[P_1]; } : never)]: T[K]; }) ? { [P in T_1]: (Omit<{
    field: import("@kbn/config-schema").Type<string>;
    suggested_interval: import("@kbn/config-schema").Type<string>;
    use_original_time_range: import("@kbn/config-schema").Type<boolean>;
    include_empty_rows: import("@kbn/config-schema").Type<boolean>;
    drop_partial_intervals: import("@kbn/config-schema").Type<boolean | undefined>;
    label: import("@kbn/config-schema").Type<string | undefined>;
    operation: import("@kbn/config-schema").Type<"date_histogram">;
}, keyof T> & { [K in keyof ({ [Key in keyof T]: undefined extends T[Key] ? never : null extends T[Key] ? never : Key; }[keyof T] extends infer T_2 extends keyof T ? { [P_2 in T_2]: T[P_2]; } : never)]: T[K]; })[P]; } : never)]?: TypeOf<(Omit<{
    field: import("@kbn/config-schema").Type<string>;
    suggested_interval: import("@kbn/config-schema").Type<string>;
    use_original_time_range: import("@kbn/config-schema").Type<boolean>;
    include_empty_rows: import("@kbn/config-schema").Type<boolean>;
    drop_partial_intervals: import("@kbn/config-schema").Type<boolean | undefined>;
    label: import("@kbn/config-schema").Type<string | undefined>;
    operation: import("@kbn/config-schema").Type<"date_histogram">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_5 extends keyof T ? { [P_1 in T_5]: T[P_1]; } : never)]: T[K]; })[K_1]> | undefined; } & { [K_2 in keyof ((Omit<{
    field: import("@kbn/config-schema").Type<string>;
    suggested_interval: import("@kbn/config-schema").Type<string>;
    use_original_time_range: import("@kbn/config-schema").Type<boolean>;
    include_empty_rows: import("@kbn/config-schema").Type<boolean>;
    drop_partial_intervals: import("@kbn/config-schema").Type<boolean | undefined>;
    label: import("@kbn/config-schema").Type<string | undefined>;
    operation: import("@kbn/config-schema").Type<"date_histogram">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_7 extends keyof T ? { [P_1 in T_7]: T[P_1]; } : never)]: T[K]; } extends infer T_6 extends Props ? { [Key_2 in keyof T_6]: undefined extends TypeOf<T_6[Key_2]> ? never : Key_2; } : never)[Exclude<"label", keyof T> | Exclude<"field", keyof T> | Exclude<"operation", keyof T> | Exclude<"suggested_interval", keyof T> | Exclude<"use_original_time_range", keyof T> | Exclude<"include_empty_rows", keyof T> | Exclude<"drop_partial_intervals", keyof T> | { [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T]] extends infer T_5 extends keyof (Omit<{
    field: import("@kbn/config-schema").Type<string>;
    suggested_interval: import("@kbn/config-schema").Type<string>;
    use_original_time_range: import("@kbn/config-schema").Type<boolean>;
    include_empty_rows: import("@kbn/config-schema").Type<boolean>;
    drop_partial_intervals: import("@kbn/config-schema").Type<boolean | undefined>;
    label: import("@kbn/config-schema").Type<string | undefined>;
    operation: import("@kbn/config-schema").Type<"date_histogram">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_8 extends keyof T ? { [P_1 in T_8]: T[P_1]; } : never)]: T[K]; }) ? { [P_2 in T_5]: (Omit<{
    field: import("@kbn/config-schema").Type<string>;
    suggested_interval: import("@kbn/config-schema").Type<string>;
    use_original_time_range: import("@kbn/config-schema").Type<boolean>;
    include_empty_rows: import("@kbn/config-schema").Type<boolean>;
    drop_partial_intervals: import("@kbn/config-schema").Type<boolean | undefined>;
    label: import("@kbn/config-schema").Type<string | undefined>;
    operation: import("@kbn/config-schema").Type<"date_histogram">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_6 extends keyof T ? { [P_1 in T_6]: T[P_1]; } : never)]: T[K]; })[P_2]; } : never)]: TypeOf<(Omit<{
    field: import("@kbn/config-schema").Type<string>;
    suggested_interval: import("@kbn/config-schema").Type<string>;
    use_original_time_range: import("@kbn/config-schema").Type<boolean>;
    include_empty_rows: import("@kbn/config-schema").Type<boolean>;
    drop_partial_intervals: import("@kbn/config-schema").Type<boolean | undefined>;
    label: import("@kbn/config-schema").Type<string | undefined>;
    operation: import("@kbn/config-schema").Type<"date_histogram">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_9 extends keyof T ? { [P_1 in T_9]: T[P_1]; } : never)]: T[K]; })[K_2]>; }> | Readonly<{ [K_3 in keyof ((Omit<{
    fields: import("@kbn/config-schema").Type<string[]>;
    limit: import("@kbn/config-schema").Type<number>;
    increase_accuracy: import("@kbn/config-schema").Type<boolean | undefined>;
    includes: import("@kbn/config-schema").Type<Readonly<{
        as_regex?: boolean | undefined;
    } & {
        values: string[];
    }> | undefined>;
    excludes: import("@kbn/config-schema").Type<Readonly<{
        as_regex?: boolean | undefined;
    } & {
        values: string[];
    }> | undefined>;
    other_bucket: import("@kbn/config-schema").Type<Readonly<{} & {
        include_documents_without_field: boolean;
    }> | undefined>;
    rank_by: import("@kbn/config-schema").Type<Readonly<{} & {
        direction: "asc" | "desc";
        type: "alphabetical";
    }> | Readonly<{} & {
        type: "rare";
        max: number;
    }> | Readonly<{} & {
        type: "significant";
    }> | Readonly<{} & {
        direction: "asc" | "desc";
        type: "metric";
        metric_index: number;
    }> | Readonly<{} & {
        direction: "asc" | "desc";
        type: "custom";
        field: string;
        operation: "min" | "max" | "sum" | "average" | "median" | "last_value" | "unique_count" | "standard_deviation";
    }> | Readonly<{
        field?: string | undefined;
    } & {
        direction: "asc" | "desc";
        type: "custom";
        operation: "count";
    }> | Readonly<{} & {
        direction: "asc" | "desc";
        type: "custom";
        field: string;
        percentile: number;
        operation: "percentile";
    }> | Readonly<{} & {
        direction: "asc" | "desc";
        type: "custom";
        field: string;
        rank: number;
        operation: "percentile_rank";
    }> | undefined>;
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
    operation: import("@kbn/config-schema").Type<"terms">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_11 extends keyof T ? { [P_1 in T_11]: T[P_1]; } : never)]: T[K]; } extends infer T_10 extends Props ? { [Key_3 in keyof T_10]: undefined extends TypeOf<T_10[Key_3]> ? Key_3 : never; } : never)[{ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] | Exclude<"includes", keyof T> | Exclude<"fields", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"limit", keyof T> | Exclude<"excludes", keyof T> | Exclude<"operation", keyof T> | Exclude<"increase_accuracy", keyof T> | Exclude<"other_bucket", keyof T> | Exclude<"rank_by", keyof T>] extends infer T_9 extends keyof (Omit<{
    fields: import("@kbn/config-schema").Type<string[]>;
    limit: import("@kbn/config-schema").Type<number>;
    increase_accuracy: import("@kbn/config-schema").Type<boolean | undefined>;
    includes: import("@kbn/config-schema").Type<Readonly<{
        as_regex?: boolean | undefined;
    } & {
        values: string[];
    }> | undefined>;
    excludes: import("@kbn/config-schema").Type<Readonly<{
        as_regex?: boolean | undefined;
    } & {
        values: string[];
    }> | undefined>;
    other_bucket: import("@kbn/config-schema").Type<Readonly<{} & {
        include_documents_without_field: boolean;
    }> | undefined>;
    rank_by: import("@kbn/config-schema").Type<Readonly<{} & {
        direction: "asc" | "desc";
        type: "alphabetical";
    }> | Readonly<{} & {
        type: "rare";
        max: number;
    }> | Readonly<{} & {
        type: "significant";
    }> | Readonly<{} & {
        direction: "asc" | "desc";
        type: "metric";
        metric_index: number;
    }> | Readonly<{} & {
        direction: "asc" | "desc";
        type: "custom";
        field: string;
        operation: "min" | "max" | "sum" | "average" | "median" | "last_value" | "unique_count" | "standard_deviation";
    }> | Readonly<{
        field?: string | undefined;
    } & {
        direction: "asc" | "desc";
        type: "custom";
        operation: "count";
    }> | Readonly<{} & {
        direction: "asc" | "desc";
        type: "custom";
        field: string;
        percentile: number;
        operation: "percentile";
    }> | Readonly<{} & {
        direction: "asc" | "desc";
        type: "custom";
        field: string;
        rank: number;
        operation: "percentile_rank";
    }> | undefined>;
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
    operation: import("@kbn/config-schema").Type<"terms">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_12 extends keyof T ? { [P_1 in T_12]: T[P_1]; } : never)]: T[K]; }) ? { [P_3 in T_9]: (Omit<{
    fields: import("@kbn/config-schema").Type<string[]>;
    limit: import("@kbn/config-schema").Type<number>;
    increase_accuracy: import("@kbn/config-schema").Type<boolean | undefined>;
    includes: import("@kbn/config-schema").Type<Readonly<{
        as_regex?: boolean | undefined;
    } & {
        values: string[];
    }> | undefined>;
    excludes: import("@kbn/config-schema").Type<Readonly<{
        as_regex?: boolean | undefined;
    } & {
        values: string[];
    }> | undefined>;
    other_bucket: import("@kbn/config-schema").Type<Readonly<{} & {
        include_documents_without_field: boolean;
    }> | undefined>;
    rank_by: import("@kbn/config-schema").Type<Readonly<{} & {
        direction: "asc" | "desc";
        type: "alphabetical";
    }> | Readonly<{} & {
        type: "rare";
        max: number;
    }> | Readonly<{} & {
        type: "significant";
    }> | Readonly<{} & {
        direction: "asc" | "desc";
        type: "metric";
        metric_index: number;
    }> | Readonly<{} & {
        direction: "asc" | "desc";
        type: "custom";
        field: string;
        operation: "min" | "max" | "sum" | "average" | "median" | "last_value" | "unique_count" | "standard_deviation";
    }> | Readonly<{
        field?: string | undefined;
    } & {
        direction: "asc" | "desc";
        type: "custom";
        operation: "count";
    }> | Readonly<{} & {
        direction: "asc" | "desc";
        type: "custom";
        field: string;
        percentile: number;
        operation: "percentile";
    }> | Readonly<{} & {
        direction: "asc" | "desc";
        type: "custom";
        field: string;
        rank: number;
        operation: "percentile_rank";
    }> | undefined>;
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
    operation: import("@kbn/config-schema").Type<"terms">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_10 extends keyof T ? { [P_1 in T_10]: T[P_1]; } : never)]: T[K]; })[P_3]; } : never)]?: TypeOf<(Omit<{
    fields: import("@kbn/config-schema").Type<string[]>;
    limit: import("@kbn/config-schema").Type<number>;
    increase_accuracy: import("@kbn/config-schema").Type<boolean | undefined>;
    includes: import("@kbn/config-schema").Type<Readonly<{
        as_regex?: boolean | undefined;
    } & {
        values: string[];
    }> | undefined>;
    excludes: import("@kbn/config-schema").Type<Readonly<{
        as_regex?: boolean | undefined;
    } & {
        values: string[];
    }> | undefined>;
    other_bucket: import("@kbn/config-schema").Type<Readonly<{} & {
        include_documents_without_field: boolean;
    }> | undefined>;
    rank_by: import("@kbn/config-schema").Type<Readonly<{} & {
        direction: "asc" | "desc";
        type: "alphabetical";
    }> | Readonly<{} & {
        type: "rare";
        max: number;
    }> | Readonly<{} & {
        type: "significant";
    }> | Readonly<{} & {
        direction: "asc" | "desc";
        type: "metric";
        metric_index: number;
    }> | Readonly<{} & {
        direction: "asc" | "desc";
        type: "custom";
        field: string;
        operation: "min" | "max" | "sum" | "average" | "median" | "last_value" | "unique_count" | "standard_deviation";
    }> | Readonly<{
        field?: string | undefined;
    } & {
        direction: "asc" | "desc";
        type: "custom";
        operation: "count";
    }> | Readonly<{} & {
        direction: "asc" | "desc";
        type: "custom";
        field: string;
        percentile: number;
        operation: "percentile";
    }> | Readonly<{} & {
        direction: "asc" | "desc";
        type: "custom";
        field: string;
        rank: number;
        operation: "percentile_rank";
    }> | undefined>;
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
    operation: import("@kbn/config-schema").Type<"terms">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_13 extends keyof T ? { [P_1 in T_13]: T[P_1]; } : never)]: T[K]; })[K_3]> | undefined; } & { [K_4 in keyof ((Omit<{
    fields: import("@kbn/config-schema").Type<string[]>;
    limit: import("@kbn/config-schema").Type<number>;
    increase_accuracy: import("@kbn/config-schema").Type<boolean | undefined>;
    includes: import("@kbn/config-schema").Type<Readonly<{
        as_regex?: boolean | undefined;
    } & {
        values: string[];
    }> | undefined>;
    excludes: import("@kbn/config-schema").Type<Readonly<{
        as_regex?: boolean | undefined;
    } & {
        values: string[];
    }> | undefined>;
    other_bucket: import("@kbn/config-schema").Type<Readonly<{} & {
        include_documents_without_field: boolean;
    }> | undefined>;
    rank_by: import("@kbn/config-schema").Type<Readonly<{} & {
        direction: "asc" | "desc";
        type: "alphabetical";
    }> | Readonly<{} & {
        type: "rare";
        max: number;
    }> | Readonly<{} & {
        type: "significant";
    }> | Readonly<{} & {
        direction: "asc" | "desc";
        type: "metric";
        metric_index: number;
    }> | Readonly<{} & {
        direction: "asc" | "desc";
        type: "custom";
        field: string;
        operation: "min" | "max" | "sum" | "average" | "median" | "last_value" | "unique_count" | "standard_deviation";
    }> | Readonly<{
        field?: string | undefined;
    } & {
        direction: "asc" | "desc";
        type: "custom";
        operation: "count";
    }> | Readonly<{} & {
        direction: "asc" | "desc";
        type: "custom";
        field: string;
        percentile: number;
        operation: "percentile";
    }> | Readonly<{} & {
        direction: "asc" | "desc";
        type: "custom";
        field: string;
        rank: number;
        operation: "percentile_rank";
    }> | undefined>;
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
    operation: import("@kbn/config-schema").Type<"terms">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_15 extends keyof T ? { [P_1 in T_15]: T[P_1]; } : never)]: T[K]; } extends infer T_14 extends Props ? { [Key_4 in keyof T_14]: undefined extends TypeOf<T_14[Key_4]> ? never : Key_4; } : never)[{ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] | Exclude<"includes", keyof T> | Exclude<"fields", keyof T> | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"limit", keyof T> | Exclude<"excludes", keyof T> | Exclude<"operation", keyof T> | Exclude<"increase_accuracy", keyof T> | Exclude<"other_bucket", keyof T> | Exclude<"rank_by", keyof T>] extends infer T_13 extends keyof (Omit<{
    fields: import("@kbn/config-schema").Type<string[]>;
    limit: import("@kbn/config-schema").Type<number>;
    increase_accuracy: import("@kbn/config-schema").Type<boolean | undefined>;
    includes: import("@kbn/config-schema").Type<Readonly<{
        as_regex?: boolean | undefined;
    } & {
        values: string[];
    }> | undefined>;
    excludes: import("@kbn/config-schema").Type<Readonly<{
        as_regex?: boolean | undefined;
    } & {
        values: string[];
    }> | undefined>;
    other_bucket: import("@kbn/config-schema").Type<Readonly<{} & {
        include_documents_without_field: boolean;
    }> | undefined>;
    rank_by: import("@kbn/config-schema").Type<Readonly<{} & {
        direction: "asc" | "desc";
        type: "alphabetical";
    }> | Readonly<{} & {
        type: "rare";
        max: number;
    }> | Readonly<{} & {
        type: "significant";
    }> | Readonly<{} & {
        direction: "asc" | "desc";
        type: "metric";
        metric_index: number;
    }> | Readonly<{} & {
        direction: "asc" | "desc";
        type: "custom";
        field: string;
        operation: "min" | "max" | "sum" | "average" | "median" | "last_value" | "unique_count" | "standard_deviation";
    }> | Readonly<{
        field?: string | undefined;
    } & {
        direction: "asc" | "desc";
        type: "custom";
        operation: "count";
    }> | Readonly<{} & {
        direction: "asc" | "desc";
        type: "custom";
        field: string;
        percentile: number;
        operation: "percentile";
    }> | Readonly<{} & {
        direction: "asc" | "desc";
        type: "custom";
        field: string;
        rank: number;
        operation: "percentile_rank";
    }> | undefined>;
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
    operation: import("@kbn/config-schema").Type<"terms">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_16 extends keyof T ? { [P_1 in T_16]: T[P_1]; } : never)]: T[K]; }) ? { [P_4 in T_13]: (Omit<{
    fields: import("@kbn/config-schema").Type<string[]>;
    limit: import("@kbn/config-schema").Type<number>;
    increase_accuracy: import("@kbn/config-schema").Type<boolean | undefined>;
    includes: import("@kbn/config-schema").Type<Readonly<{
        as_regex?: boolean | undefined;
    } & {
        values: string[];
    }> | undefined>;
    excludes: import("@kbn/config-schema").Type<Readonly<{
        as_regex?: boolean | undefined;
    } & {
        values: string[];
    }> | undefined>;
    other_bucket: import("@kbn/config-schema").Type<Readonly<{} & {
        include_documents_without_field: boolean;
    }> | undefined>;
    rank_by: import("@kbn/config-schema").Type<Readonly<{} & {
        direction: "asc" | "desc";
        type: "alphabetical";
    }> | Readonly<{} & {
        type: "rare";
        max: number;
    }> | Readonly<{} & {
        type: "significant";
    }> | Readonly<{} & {
        direction: "asc" | "desc";
        type: "metric";
        metric_index: number;
    }> | Readonly<{} & {
        direction: "asc" | "desc";
        type: "custom";
        field: string;
        operation: "min" | "max" | "sum" | "average" | "median" | "last_value" | "unique_count" | "standard_deviation";
    }> | Readonly<{
        field?: string | undefined;
    } & {
        direction: "asc" | "desc";
        type: "custom";
        operation: "count";
    }> | Readonly<{} & {
        direction: "asc" | "desc";
        type: "custom";
        field: string;
        percentile: number;
        operation: "percentile";
    }> | Readonly<{} & {
        direction: "asc" | "desc";
        type: "custom";
        field: string;
        rank: number;
        operation: "percentile_rank";
    }> | undefined>;
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
    operation: import("@kbn/config-schema").Type<"terms">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_14 extends keyof T ? { [P_1 in T_14]: T[P_1]; } : never)]: T[K]; })[P_4]; } : never)]: TypeOf<(Omit<{
    fields: import("@kbn/config-schema").Type<string[]>;
    limit: import("@kbn/config-schema").Type<number>;
    increase_accuracy: import("@kbn/config-schema").Type<boolean | undefined>;
    includes: import("@kbn/config-schema").Type<Readonly<{
        as_regex?: boolean | undefined;
    } & {
        values: string[];
    }> | undefined>;
    excludes: import("@kbn/config-schema").Type<Readonly<{
        as_regex?: boolean | undefined;
    } & {
        values: string[];
    }> | undefined>;
    other_bucket: import("@kbn/config-schema").Type<Readonly<{} & {
        include_documents_without_field: boolean;
    }> | undefined>;
    rank_by: import("@kbn/config-schema").Type<Readonly<{} & {
        direction: "asc" | "desc";
        type: "alphabetical";
    }> | Readonly<{} & {
        type: "rare";
        max: number;
    }> | Readonly<{} & {
        type: "significant";
    }> | Readonly<{} & {
        direction: "asc" | "desc";
        type: "metric";
        metric_index: number;
    }> | Readonly<{} & {
        direction: "asc" | "desc";
        type: "custom";
        field: string;
        operation: "min" | "max" | "sum" | "average" | "median" | "last_value" | "unique_count" | "standard_deviation";
    }> | Readonly<{
        field?: string | undefined;
    } & {
        direction: "asc" | "desc";
        type: "custom";
        operation: "count";
    }> | Readonly<{} & {
        direction: "asc" | "desc";
        type: "custom";
        field: string;
        percentile: number;
        operation: "percentile";
    }> | Readonly<{} & {
        direction: "asc" | "desc";
        type: "custom";
        field: string;
        rank: number;
        operation: "percentile_rank";
    }> | undefined>;
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
    operation: import("@kbn/config-schema").Type<"terms">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_17 extends keyof T ? { [P_1 in T_17]: T[P_1]; } : never)]: T[K]; })[K_4]>; }> | Readonly<{ [K_5 in keyof ((Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    field: import("@kbn/config-schema").Type<string>;
    granularity: import("@kbn/config-schema").Type<number | "auto">;
    include_empty_rows: import("@kbn/config-schema").Type<boolean>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
    operation: import("@kbn/config-schema").Type<"histogram">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_19 extends keyof T ? { [P_1 in T_19]: T[P_1]; } : never)]: T[K]; } extends infer T_18 extends Props ? { [Key_5 in keyof T_18]: undefined extends TypeOf<T_18[Key_5]> ? Key_5 : never; } : never)[{ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"field", keyof T> | Exclude<"operation", keyof T> | Exclude<"include_empty_rows", keyof T> | Exclude<"granularity", keyof T>] extends infer T_17 extends keyof (Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    field: import("@kbn/config-schema").Type<string>;
    granularity: import("@kbn/config-schema").Type<number | "auto">;
    include_empty_rows: import("@kbn/config-schema").Type<boolean>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
    operation: import("@kbn/config-schema").Type<"histogram">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_20 extends keyof T ? { [P_1 in T_20]: T[P_1]; } : never)]: T[K]; }) ? { [P_5 in T_17]: (Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    field: import("@kbn/config-schema").Type<string>;
    granularity: import("@kbn/config-schema").Type<number | "auto">;
    include_empty_rows: import("@kbn/config-schema").Type<boolean>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
    operation: import("@kbn/config-schema").Type<"histogram">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_18 extends keyof T ? { [P_1 in T_18]: T[P_1]; } : never)]: T[K]; })[P_5]; } : never)]?: TypeOf<(Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    field: import("@kbn/config-schema").Type<string>;
    granularity: import("@kbn/config-schema").Type<number | "auto">;
    include_empty_rows: import("@kbn/config-schema").Type<boolean>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
    operation: import("@kbn/config-schema").Type<"histogram">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_21 extends keyof T ? { [P_1 in T_21]: T[P_1]; } : never)]: T[K]; })[K_5]> | undefined; } & { [K_6 in keyof ((Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    field: import("@kbn/config-schema").Type<string>;
    granularity: import("@kbn/config-schema").Type<number | "auto">;
    include_empty_rows: import("@kbn/config-schema").Type<boolean>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
    operation: import("@kbn/config-schema").Type<"histogram">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_23 extends keyof T ? { [P_1 in T_23]: T[P_1]; } : never)]: T[K]; } extends infer T_22 extends Props ? { [Key_6 in keyof T_22]: undefined extends TypeOf<T_22[Key_6]> ? never : Key_6; } : never)[{ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"field", keyof T> | Exclude<"operation", keyof T> | Exclude<"include_empty_rows", keyof T> | Exclude<"granularity", keyof T>] extends infer T_21 extends keyof (Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    field: import("@kbn/config-schema").Type<string>;
    granularity: import("@kbn/config-schema").Type<number | "auto">;
    include_empty_rows: import("@kbn/config-schema").Type<boolean>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
    operation: import("@kbn/config-schema").Type<"histogram">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_24 extends keyof T ? { [P_1 in T_24]: T[P_1]; } : never)]: T[K]; }) ? { [P_6 in T_21]: (Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    field: import("@kbn/config-schema").Type<string>;
    granularity: import("@kbn/config-schema").Type<number | "auto">;
    include_empty_rows: import("@kbn/config-schema").Type<boolean>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
    operation: import("@kbn/config-schema").Type<"histogram">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_22 extends keyof T ? { [P_1 in T_22]: T[P_1]; } : never)]: T[K]; })[P_6]; } : never)]: TypeOf<(Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    field: import("@kbn/config-schema").Type<string>;
    granularity: import("@kbn/config-schema").Type<number | "auto">;
    include_empty_rows: import("@kbn/config-schema").Type<boolean>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
    operation: import("@kbn/config-schema").Type<"histogram">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_25 extends keyof T ? { [P_1 in T_25]: T[P_1]; } : never)]: T[K]; })[K_6]>; }> | Readonly<{ [K_7 in keyof ((Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    field: import("@kbn/config-schema").Type<string>;
    ranges: import("@kbn/config-schema").Type<Readonly<{
        label?: string | undefined;
        gt?: number | undefined;
        lte?: number | undefined;
    } & {}>[]>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
    operation: import("@kbn/config-schema").Type<"range">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_27 extends keyof T ? { [P_1 in T_27]: T[P_1]; } : never)]: T[K]; } extends infer T_26 extends Props ? { [Key_7 in keyof T_26]: undefined extends TypeOf<T_26[Key_7]> ? Key_7 : never; } : never)[{ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"field", keyof T> | Exclude<"ranges", keyof T> | Exclude<"operation", keyof T>] extends infer T_25 extends keyof (Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    field: import("@kbn/config-schema").Type<string>;
    ranges: import("@kbn/config-schema").Type<Readonly<{
        label?: string | undefined;
        gt?: number | undefined;
        lte?: number | undefined;
    } & {}>[]>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
    operation: import("@kbn/config-schema").Type<"range">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_28 extends keyof T ? { [P_1 in T_28]: T[P_1]; } : never)]: T[K]; }) ? { [P_7 in T_25]: (Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    field: import("@kbn/config-schema").Type<string>;
    ranges: import("@kbn/config-schema").Type<Readonly<{
        label?: string | undefined;
        gt?: number | undefined;
        lte?: number | undefined;
    } & {}>[]>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
    operation: import("@kbn/config-schema").Type<"range">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_26 extends keyof T ? { [P_1 in T_26]: T[P_1]; } : never)]: T[K]; })[P_7]; } : never)]?: TypeOf<(Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    field: import("@kbn/config-schema").Type<string>;
    ranges: import("@kbn/config-schema").Type<Readonly<{
        label?: string | undefined;
        gt?: number | undefined;
        lte?: number | undefined;
    } & {}>[]>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
    operation: import("@kbn/config-schema").Type<"range">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_29 extends keyof T ? { [P_1 in T_29]: T[P_1]; } : never)]: T[K]; })[K_7]> | undefined; } & { [K_8 in keyof ((Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    field: import("@kbn/config-schema").Type<string>;
    ranges: import("@kbn/config-schema").Type<Readonly<{
        label?: string | undefined;
        gt?: number | undefined;
        lte?: number | undefined;
    } & {}>[]>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
    operation: import("@kbn/config-schema").Type<"range">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_31 extends keyof T ? { [P_1 in T_31]: T[P_1]; } : never)]: T[K]; } extends infer T_30 extends Props ? { [Key_8 in keyof T_30]: undefined extends TypeOf<T_30[Key_8]> ? never : Key_8; } : never)[{ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] | Exclude<"format", keyof T> | Exclude<"label", keyof T> | Exclude<"field", keyof T> | Exclude<"ranges", keyof T> | Exclude<"operation", keyof T>] extends infer T_29 extends keyof (Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    field: import("@kbn/config-schema").Type<string>;
    ranges: import("@kbn/config-schema").Type<Readonly<{
        label?: string | undefined;
        gt?: number | undefined;
        lte?: number | undefined;
    } & {}>[]>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
    operation: import("@kbn/config-schema").Type<"range">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_32 extends keyof T ? { [P_1 in T_32]: T[P_1]; } : never)]: T[K]; }) ? { [P_8 in T_29]: (Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    field: import("@kbn/config-schema").Type<string>;
    ranges: import("@kbn/config-schema").Type<Readonly<{
        label?: string | undefined;
        gt?: number | undefined;
        lte?: number | undefined;
    } & {}>[]>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
    operation: import("@kbn/config-schema").Type<"range">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_30 extends keyof T ? { [P_1 in T_30]: T[P_1]; } : never)]: T[K]; })[P_8]; } : never)]: TypeOf<(Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    field: import("@kbn/config-schema").Type<string>;
    ranges: import("@kbn/config-schema").Type<Readonly<{
        label?: string | undefined;
        gt?: number | undefined;
        lte?: number | undefined;
    } & {}>[]>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
    operation: import("@kbn/config-schema").Type<"range">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_33 extends keyof T ? { [P_1 in T_33]: T[P_1]; } : never)]: T[K]; })[K_8]>; }> | Readonly<{ [K_9 in keyof ((Omit<{
    filters: import("@kbn/config-schema").Type<Readonly<{
        label?: string | undefined;
    } & {
        filter: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }>;
    }>[]>;
    label: import("@kbn/config-schema").Type<string | undefined>;
    operation: import("@kbn/config-schema").Type<"filters">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_35 extends keyof T ? { [P_1 in T_35]: T[P_1]; } : never)]: T[K]; } extends infer T_34 extends Props ? { [Key_9 in keyof T_34]: undefined extends TypeOf<T_34[Key_9]> ? Key_9 : never; } : never)[{ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] | Exclude<"filters", keyof T> | Exclude<"label", keyof T> | Exclude<"operation", keyof T>] extends infer T_33 extends keyof (Omit<{
    filters: import("@kbn/config-schema").Type<Readonly<{
        label?: string | undefined;
    } & {
        filter: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }>;
    }>[]>;
    label: import("@kbn/config-schema").Type<string | undefined>;
    operation: import("@kbn/config-schema").Type<"filters">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_36 extends keyof T ? { [P_1 in T_36]: T[P_1]; } : never)]: T[K]; }) ? { [P_9 in T_33]: (Omit<{
    filters: import("@kbn/config-schema").Type<Readonly<{
        label?: string | undefined;
    } & {
        filter: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }>;
    }>[]>;
    label: import("@kbn/config-schema").Type<string | undefined>;
    operation: import("@kbn/config-schema").Type<"filters">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_34 extends keyof T ? { [P_1 in T_34]: T[P_1]; } : never)]: T[K]; })[P_9]; } : never)]?: TypeOf<(Omit<{
    filters: import("@kbn/config-schema").Type<Readonly<{
        label?: string | undefined;
    } & {
        filter: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }>;
    }>[]>;
    label: import("@kbn/config-schema").Type<string | undefined>;
    operation: import("@kbn/config-schema").Type<"filters">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_37 extends keyof T ? { [P_1 in T_37]: T[P_1]; } : never)]: T[K]; })[K_9]> | undefined; } & { [K_10 in keyof ((Omit<{
    filters: import("@kbn/config-schema").Type<Readonly<{
        label?: string | undefined;
    } & {
        filter: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }>;
    }>[]>;
    label: import("@kbn/config-schema").Type<string | undefined>;
    operation: import("@kbn/config-schema").Type<"filters">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_39 extends keyof T ? { [P_1 in T_39]: T[P_1]; } : never)]: T[K]; } extends infer T_38 extends Props ? { [Key_10 in keyof T_38]: undefined extends TypeOf<T_38[Key_10]> ? never : Key_10; } : never)[{ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] | Exclude<"filters", keyof T> | Exclude<"label", keyof T> | Exclude<"operation", keyof T>] extends infer T_37 extends keyof (Omit<{
    filters: import("@kbn/config-schema").Type<Readonly<{
        label?: string | undefined;
    } & {
        filter: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }>;
    }>[]>;
    label: import("@kbn/config-schema").Type<string | undefined>;
    operation: import("@kbn/config-schema").Type<"filters">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_40 extends keyof T ? { [P_1 in T_40]: T[P_1]; } : never)]: T[K]; }) ? { [P_10 in T_37]: (Omit<{
    filters: import("@kbn/config-schema").Type<Readonly<{
        label?: string | undefined;
    } & {
        filter: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }>;
    }>[]>;
    label: import("@kbn/config-schema").Type<string | undefined>;
    operation: import("@kbn/config-schema").Type<"filters">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_38 extends keyof T ? { [P_1 in T_38]: T[P_1]; } : never)]: T[K]; })[P_10]; } : never)]: TypeOf<(Omit<{
    filters: import("@kbn/config-schema").Type<Readonly<{
        label?: string | undefined;
    } & {
        filter: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }>;
    }>[]>;
    label: import("@kbn/config-schema").Type<string | undefined>;
    operation: import("@kbn/config-schema").Type<"filters">;
}, keyof T> & { [K in keyof ({ [Key_1 in keyof T]: undefined extends T[Key_1] ? never : null extends T[Key_1] ? never : Key_1; }[keyof T] extends infer T_41 extends keyof T ? { [P_1 in T_41]: T[P_1]; } : never)]: T[K]; })[K_10]>; }>>;
/**
 * X-axis scale type for data transformation
 */
export declare const xScaleSchema: import("@kbn/config-schema").Type<"linear" | "ordinal" | "temporal">;
export type XScaleSchemaType = TypeOf<typeof xScaleSchema>;
