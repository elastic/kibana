import type { TypeOf } from '@kbn/config-schema';
export declare const legacyMetricConfigSchemaNoESQL: import("@kbn/config-schema").ObjectType<{
    /**
     * Metric configuration, must define operation.
     */
    metric: import("@kbn/config-schema").Type<Readonly<{
        filter?: Readonly<{} & {
            language: "lucene" | "kql";
            expression: string;
        }> | undefined;
        values?: Readonly<{} & {
            alignment: "center" | "left" | "right";
        }> | undefined;
        size?: "xs" | "s" | "m" | "l" | "xl" | "xxl" | undefined;
        field?: string | undefined;
        color?: Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            range: "absolute";
            palette: string;
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "distributed_palette";
            palette: "temperature" | "complementary" | "status" | "gray" | "warm" | "positive" | "cool" | "negative";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
            to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        labels?: Readonly<{} & {
            alignment: "top" | "bottom";
        }> | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        apply_color_to?: "value" | "background" | undefined;
    } & {
        operation: "count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            language: "lucene" | "kql";
            expression: string;
        }> | undefined;
        values?: Readonly<{} & {
            alignment: "center" | "left" | "right";
        }> | undefined;
        size?: "xs" | "s" | "m" | "l" | "xl" | "xxl" | undefined;
        color?: Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            range: "absolute";
            palette: string;
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "distributed_palette";
            palette: "temperature" | "complementary" | "status" | "gray" | "warm" | "positive" | "cool" | "negative";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
            to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        labels?: Readonly<{} & {
            alignment: "top" | "bottom";
        }> | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        apply_color_to?: "value" | "background" | undefined;
    } & {
        field: string;
        operation: "unique_count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            language: "lucene" | "kql";
            expression: string;
        }> | undefined;
        values?: Readonly<{} & {
            alignment: "center" | "left" | "right";
        }> | undefined;
        size?: "xs" | "s" | "m" | "l" | "xl" | "xxl" | undefined;
        color?: Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            range: "absolute";
            palette: string;
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "distributed_palette";
            palette: "temperature" | "complementary" | "status" | "gray" | "warm" | "positive" | "cool" | "negative";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
            to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        labels?: Readonly<{} & {
            alignment: "top" | "bottom";
        }> | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        apply_color_to?: "value" | "background" | undefined;
    } & {
        field: string;
        operation: "max" | "min" | "median" | "average" | "standard_deviation";
    }> | Readonly<{
        filter?: Readonly<{} & {
            language: "lucene" | "kql";
            expression: string;
        }> | undefined;
        values?: Readonly<{} & {
            alignment: "center" | "left" | "right";
        }> | undefined;
        size?: "xs" | "s" | "m" | "l" | "xl" | "xxl" | undefined;
        color?: Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            range: "absolute";
            palette: string;
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "distributed_palette";
            palette: "temperature" | "complementary" | "status" | "gray" | "warm" | "positive" | "cool" | "negative";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
            to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        labels?: Readonly<{} & {
            alignment: "top" | "bottom";
        }> | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        apply_color_to?: "value" | "background" | undefined;
    } & {
        field: string;
        operation: "sum";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            language: "lucene" | "kql";
            expression: string;
        }> | undefined;
        values?: Readonly<{} & {
            alignment: "center" | "left" | "right";
        }> | undefined;
        size?: "xs" | "s" | "m" | "l" | "xl" | "xxl" | undefined;
        color?: Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            range: "absolute";
            palette: string;
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "distributed_palette";
            palette: "temperature" | "complementary" | "status" | "gray" | "warm" | "positive" | "cool" | "negative";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
            to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        labels?: Readonly<{} & {
            alignment: "top" | "bottom";
        }> | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        apply_color_to?: "value" | "background" | undefined;
    } & {
        field: string;
        operation: "last_value";
        time_field: string;
        multi_value: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            language: "lucene" | "kql";
            expression: string;
        }> | undefined;
        values?: Readonly<{} & {
            alignment: "center" | "left" | "right";
        }> | undefined;
        size?: "xs" | "s" | "m" | "l" | "xl" | "xxl" | undefined;
        color?: Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            range: "absolute";
            palette: string;
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "distributed_palette";
            palette: "temperature" | "complementary" | "status" | "gray" | "warm" | "positive" | "cool" | "negative";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
            to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        labels?: Readonly<{} & {
            alignment: "top" | "bottom";
        }> | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        apply_color_to?: "value" | "background" | undefined;
    } & {
        field: string;
        percentile: number;
        operation: "percentile";
    }> | Readonly<{
        filter?: Readonly<{} & {
            language: "lucene" | "kql";
            expression: string;
        }> | undefined;
        values?: Readonly<{} & {
            alignment: "center" | "left" | "right";
        }> | undefined;
        size?: "xs" | "s" | "m" | "l" | "xl" | "xxl" | undefined;
        color?: Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            range: "absolute";
            palette: string;
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "distributed_palette";
            palette: "temperature" | "complementary" | "status" | "gray" | "warm" | "positive" | "cool" | "negative";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
            to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        labels?: Readonly<{} & {
            alignment: "top" | "bottom";
        }> | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        apply_color_to?: "value" | "background" | undefined;
    } & {
        field: string;
        rank: number;
        operation: "percentile_rank";
    }> | Readonly<{
        filter?: Readonly<{} & {
            language: "lucene" | "kql";
            expression: string;
        }> | undefined;
        values?: Readonly<{} & {
            alignment: "center" | "left" | "right";
        }> | undefined;
        size?: "xs" | "s" | "m" | "l" | "xl" | "xxl" | undefined;
        color?: Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            range: "absolute";
            palette: string;
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "distributed_palette";
            palette: "temperature" | "complementary" | "status" | "gray" | "warm" | "positive" | "cool" | "negative";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
            to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        labels?: Readonly<{} & {
            alignment: "top" | "bottom";
        }> | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        reduced_time_range?: string | undefined;
        apply_color_to?: "value" | "background" | undefined;
    } & {
        operation: "formula";
        formula: string;
    }>>;
    data_source: import("@kbn/config-schema").Type<import("@kbn/config-schema/src/types").ObjectResultUnionType<{
        type: import("@kbn/config-schema").Type<"data_view_reference">;
        ref_id: import("@kbn/config-schema").Type<string>;
    } | {
        name: import("@kbn/config-schema").Type<string | undefined>;
        type: import("@kbn/config-schema").Type<"data_view_spec">;
        index_pattern: import("@kbn/config-schema").Type<string>;
        time_field: import("@kbn/config-schema").Type<string | undefined>;
        allow_hidden_indices: import("@kbn/config-schema").Type<boolean | undefined>;
        field_settings: import("@kbn/config-schema").Type<Record<string, Readonly<{
            format?: Readonly<{
                params?: any;
            } & {
                type: string;
            }> | undefined;
            custom_label?: string | undefined;
            custom_description?: string | undefined;
        } & {}> | Readonly<{
            script?: string | undefined;
            format?: Readonly<{
                params?: any;
            } & {
                type: string;
            }> | undefined;
            custom_label?: string | undefined;
            custom_description?: string | undefined;
        } & {
            type: "boolean" | "ip" | "date" | "geo_point" | "double" | "keyword" | "long";
        }> | Readonly<{
            script?: string | undefined;
        } & {
            type: "composite";
            fields: Record<string, Readonly<{
                format?: Readonly<{
                    params?: any;
                } & {
                    type: string;
                }> | undefined;
                custom_label?: string | undefined;
                custom_description?: string | undefined;
            } & {
                type: "boolean" | "ip" | "date" | "geo_point" | "double" | "keyword" | "long";
            }>>;
        }>> | undefined>;
    }>>;
    ignore_global_filters: import("@kbn/config-schema").Type<boolean>;
    sampling: import("@kbn/config-schema").Type<number>;
    query: import("@kbn/config-schema").Type<Readonly<{} & {
        language: "lucene" | "kql";
        expression: string;
    }> | undefined>;
    title: import("@kbn/config-schema").Type<string | undefined>;
    description: import("@kbn/config-schema").Type<string | undefined>;
    filters: import("@kbn/config-schema").Type<import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
        disabled: import("@kbn/config-schema").Type<boolean | undefined>;
        negate: import("@kbn/config-schema").Type<boolean | undefined>;
        controlled_by: import("@kbn/config-schema").Type<string | undefined>;
        data_view_id: import("@kbn/config-schema").Type<string | undefined>;
        label: import("@kbn/config-schema").Type<string | undefined>;
        is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
    }, "type" | "condition"> & {
        type: import("@kbn/config-schema").Type<"condition">;
        condition: import("@kbn/config-schema").Type<import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
            field: import("@kbn/config-schema").Type<string>;
            negate: import("@kbn/config-schema").Type<boolean | undefined>;
        }, "value" | "operator"> & {
            value: import("@kbn/config-schema").Type<string | number | boolean>;
            operator: import("@kbn/config-schema").Type<"is">;
        }) | (Omit<{
            field: import("@kbn/config-schema").Type<string>;
            negate: import("@kbn/config-schema").Type<boolean | undefined>;
        }, "value" | "operator"> & {
            value: import("@kbn/config-schema").Type<number[] | string[] | boolean[]>;
            operator: import("@kbn/config-schema").Type<"is_one_of">;
        }) | (Omit<{
            field: import("@kbn/config-schema").Type<string>;
            negate: import("@kbn/config-schema").Type<boolean | undefined>;
        }, "value" | "operator"> & {
            value: import("@kbn/config-schema").ObjectType<{
                gte: import("@kbn/config-schema").Type<string | number | undefined>;
                lte: import("@kbn/config-schema").Type<string | number | undefined>;
                gt: import("@kbn/config-schema").Type<string | number | undefined>;
                lt: import("@kbn/config-schema").Type<string | number | undefined>;
                format: import("@kbn/config-schema").Type<string | undefined>;
            }>;
            operator: import("@kbn/config-schema").Type<"range">;
        }) | (Omit<{
            field: import("@kbn/config-schema").Type<string>;
            negate: import("@kbn/config-schema").Type<boolean | undefined>;
        }, "operator"> & {
            operator: import("@kbn/config-schema").Type<"exists">;
        })>>;
    }) | (Omit<{
        disabled: import("@kbn/config-schema").Type<boolean | undefined>;
        negate: import("@kbn/config-schema").Type<boolean | undefined>;
        controlled_by: import("@kbn/config-schema").Type<string | undefined>;
        data_view_id: import("@kbn/config-schema").Type<string | undefined>;
        label: import("@kbn/config-schema").Type<string | undefined>;
        is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
    }, "type" | "group"> & {
        type: import("@kbn/config-schema").Type<"group">;
        group: import("@kbn/config-schema").ObjectType<{
            operator: import("@kbn/config-schema").Type<"and" | "or">;
            conditions: import("@kbn/config-schema").Type<(import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
                field: import("@kbn/config-schema").Type<string>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "value" | "operator"> & {
                value: import("@kbn/config-schema").Type<string | number | boolean>;
                operator: import("@kbn/config-schema").Type<"is">;
            }) | (Omit<{
                field: import("@kbn/config-schema").Type<string>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "value" | "operator"> & {
                value: import("@kbn/config-schema").Type<number[] | string[] | boolean[]>;
                operator: import("@kbn/config-schema").Type<"is_one_of">;
            }) | (Omit<{
                field: import("@kbn/config-schema").Type<string>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "value" | "operator"> & {
                value: import("@kbn/config-schema").ObjectType<{
                    gte: import("@kbn/config-schema").Type<string | number | undefined>;
                    lte: import("@kbn/config-schema").Type<string | number | undefined>;
                    gt: import("@kbn/config-schema").Type<string | number | undefined>;
                    lt: import("@kbn/config-schema").Type<string | number | undefined>;
                    format: import("@kbn/config-schema").Type<string | undefined>;
                }>;
                operator: import("@kbn/config-schema").Type<"range">;
            }) | (Omit<{
                field: import("@kbn/config-schema").Type<string>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "operator"> & {
                operator: import("@kbn/config-schema").Type<"exists">;
            })> | import("@kbn/as-code-filters-schema").AsCodeGroupFilterRecursive)[]>;
        }>;
    }) | (Omit<{
        disabled: import("@kbn/config-schema").Type<boolean | undefined>;
        negate: import("@kbn/config-schema").Type<boolean | undefined>;
        controlled_by: import("@kbn/config-schema").Type<string | undefined>;
        data_view_id: import("@kbn/config-schema").Type<string | undefined>;
        label: import("@kbn/config-schema").Type<string | undefined>;
        is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
    }, "type" | "params" | "field" | "dsl"> & {
        type: import("@kbn/config-schema").Type<"dsl">;
        params: import("@kbn/config-schema").Type<any>;
        field: import("@kbn/config-schema").Type<string | undefined>;
        dsl: import("@kbn/config-schema").Type<Record<string, any>>;
    }) | (Omit<{
        disabled: import("@kbn/config-schema").Type<boolean | undefined>;
        negate: import("@kbn/config-schema").Type<boolean | undefined>;
        controlled_by: import("@kbn/config-schema").Type<string | undefined>;
        data_view_id: import("@kbn/config-schema").Type<string | undefined>;
        label: import("@kbn/config-schema").Type<string | undefined>;
        is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
    }, "type" | "dsl"> & {
        type: import("@kbn/config-schema").Type<"spatial">;
        dsl: import("@kbn/config-schema").Type<Record<string, any>>;
    })>[] | undefined>;
    type: import("@kbn/config-schema").Type<"legacy_metric">;
}>;
declare const esqlLegacyMetricConfig: import("@kbn/config-schema").ObjectType<{
    /**
     * Metric configuration, must define operation.
     */
    metric: import("@kbn/config-schema").ObjectType<Omit<Omit<{
        label: import("@kbn/config-schema").Type<string | undefined>;
        column: import("@kbn/config-schema").Type<string>;
    }, "format"> & {
        format: import("@kbn/config-schema").Type<Readonly<{
            suffix?: string | undefined;
        } & {
            from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
            to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined>;
    }, "values" | "size" | "color" | "labels" | "apply_color_to"> & {
        values: import("@kbn/config-schema").Type<Readonly<{} & {
            alignment: "center" | "left" | "right";
        }> | undefined>;
        size: import("@kbn/config-schema").Type<"xs" | "s" | "m" | "l" | "xl" | "xxl" | undefined>;
        color: import("@kbn/config-schema").Type<Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            range: "absolute";
            palette: string;
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "distributed_palette";
            palette: "temperature" | "complementary" | "status" | "gray" | "warm" | "positive" | "cool" | "negative";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined>;
        labels: import("@kbn/config-schema").Type<Readonly<{} & {
            alignment: "top" | "bottom";
        }> | undefined>;
        apply_color_to: import("@kbn/config-schema").Type<"value" | "background" | undefined>;
    }>;
    data_source: import("@kbn/config-schema").ObjectType<{
        type: import("@kbn/config-schema").Type<"esql">;
        query: import("@kbn/config-schema").Type<string>;
    }>;
    ignore_global_filters: import("@kbn/config-schema").Type<boolean>;
    sampling: import("@kbn/config-schema").Type<number>;
    title: import("@kbn/config-schema").Type<string | undefined>;
    description: import("@kbn/config-schema").Type<string | undefined>;
    filters: import("@kbn/config-schema").Type<import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
        disabled: import("@kbn/config-schema").Type<boolean | undefined>;
        negate: import("@kbn/config-schema").Type<boolean | undefined>;
        controlled_by: import("@kbn/config-schema").Type<string | undefined>;
        data_view_id: import("@kbn/config-schema").Type<string | undefined>;
        label: import("@kbn/config-schema").Type<string | undefined>;
        is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
    }, "type" | "condition"> & {
        type: import("@kbn/config-schema").Type<"condition">;
        condition: import("@kbn/config-schema").Type<import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
            field: import("@kbn/config-schema").Type<string>;
            negate: import("@kbn/config-schema").Type<boolean | undefined>;
        }, "value" | "operator"> & {
            value: import("@kbn/config-schema").Type<string | number | boolean>;
            operator: import("@kbn/config-schema").Type<"is">;
        }) | (Omit<{
            field: import("@kbn/config-schema").Type<string>;
            negate: import("@kbn/config-schema").Type<boolean | undefined>;
        }, "value" | "operator"> & {
            value: import("@kbn/config-schema").Type<number[] | string[] | boolean[]>;
            operator: import("@kbn/config-schema").Type<"is_one_of">;
        }) | (Omit<{
            field: import("@kbn/config-schema").Type<string>;
            negate: import("@kbn/config-schema").Type<boolean | undefined>;
        }, "value" | "operator"> & {
            value: import("@kbn/config-schema").ObjectType<{
                gte: import("@kbn/config-schema").Type<string | number | undefined>;
                lte: import("@kbn/config-schema").Type<string | number | undefined>;
                gt: import("@kbn/config-schema").Type<string | number | undefined>;
                lt: import("@kbn/config-schema").Type<string | number | undefined>;
                format: import("@kbn/config-schema").Type<string | undefined>;
            }>;
            operator: import("@kbn/config-schema").Type<"range">;
        }) | (Omit<{
            field: import("@kbn/config-schema").Type<string>;
            negate: import("@kbn/config-schema").Type<boolean | undefined>;
        }, "operator"> & {
            operator: import("@kbn/config-schema").Type<"exists">;
        })>>;
    }) | (Omit<{
        disabled: import("@kbn/config-schema").Type<boolean | undefined>;
        negate: import("@kbn/config-schema").Type<boolean | undefined>;
        controlled_by: import("@kbn/config-schema").Type<string | undefined>;
        data_view_id: import("@kbn/config-schema").Type<string | undefined>;
        label: import("@kbn/config-schema").Type<string | undefined>;
        is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
    }, "type" | "group"> & {
        type: import("@kbn/config-schema").Type<"group">;
        group: import("@kbn/config-schema").ObjectType<{
            operator: import("@kbn/config-schema").Type<"and" | "or">;
            conditions: import("@kbn/config-schema").Type<(import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
                field: import("@kbn/config-schema").Type<string>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "value" | "operator"> & {
                value: import("@kbn/config-schema").Type<string | number | boolean>;
                operator: import("@kbn/config-schema").Type<"is">;
            }) | (Omit<{
                field: import("@kbn/config-schema").Type<string>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "value" | "operator"> & {
                value: import("@kbn/config-schema").Type<number[] | string[] | boolean[]>;
                operator: import("@kbn/config-schema").Type<"is_one_of">;
            }) | (Omit<{
                field: import("@kbn/config-schema").Type<string>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "value" | "operator"> & {
                value: import("@kbn/config-schema").ObjectType<{
                    gte: import("@kbn/config-schema").Type<string | number | undefined>;
                    lte: import("@kbn/config-schema").Type<string | number | undefined>;
                    gt: import("@kbn/config-schema").Type<string | number | undefined>;
                    lt: import("@kbn/config-schema").Type<string | number | undefined>;
                    format: import("@kbn/config-schema").Type<string | undefined>;
                }>;
                operator: import("@kbn/config-schema").Type<"range">;
            }) | (Omit<{
                field: import("@kbn/config-schema").Type<string>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "operator"> & {
                operator: import("@kbn/config-schema").Type<"exists">;
            })> | import("@kbn/as-code-filters-schema").AsCodeGroupFilterRecursive)[]>;
        }>;
    }) | (Omit<{
        disabled: import("@kbn/config-schema").Type<boolean | undefined>;
        negate: import("@kbn/config-schema").Type<boolean | undefined>;
        controlled_by: import("@kbn/config-schema").Type<string | undefined>;
        data_view_id: import("@kbn/config-schema").Type<string | undefined>;
        label: import("@kbn/config-schema").Type<string | undefined>;
        is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
    }, "type" | "params" | "field" | "dsl"> & {
        type: import("@kbn/config-schema").Type<"dsl">;
        params: import("@kbn/config-schema").Type<any>;
        field: import("@kbn/config-schema").Type<string | undefined>;
        dsl: import("@kbn/config-schema").Type<Record<string, any>>;
    }) | (Omit<{
        disabled: import("@kbn/config-schema").Type<boolean | undefined>;
        negate: import("@kbn/config-schema").Type<boolean | undefined>;
        controlled_by: import("@kbn/config-schema").Type<string | undefined>;
        data_view_id: import("@kbn/config-schema").Type<string | undefined>;
        label: import("@kbn/config-schema").Type<string | undefined>;
        is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
    }, "type" | "dsl"> & {
        type: import("@kbn/config-schema").Type<"spatial">;
        dsl: import("@kbn/config-schema").Type<Record<string, any>>;
    })>[] | undefined>;
    type: import("@kbn/config-schema").Type<"legacy_metric">;
}>;
export declare const legacyMetricConfigSchema: import("./utils/object_union").ObjectUnionType<[import("@kbn/config-schema").ObjectType<{
    /**
     * Metric configuration, must define operation.
     */
    metric: import("@kbn/config-schema").Type<Readonly<{
        filter?: Readonly<{} & {
            language: "lucene" | "kql";
            expression: string;
        }> | undefined;
        values?: Readonly<{} & {
            alignment: "center" | "left" | "right";
        }> | undefined;
        size?: "xs" | "s" | "m" | "l" | "xl" | "xxl" | undefined;
        field?: string | undefined;
        color?: Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            range: "absolute";
            palette: string;
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "distributed_palette";
            palette: "temperature" | "complementary" | "status" | "gray" | "warm" | "positive" | "cool" | "negative";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
            to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        labels?: Readonly<{} & {
            alignment: "top" | "bottom";
        }> | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        apply_color_to?: "value" | "background" | undefined;
    } & {
        operation: "count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            language: "lucene" | "kql";
            expression: string;
        }> | undefined;
        values?: Readonly<{} & {
            alignment: "center" | "left" | "right";
        }> | undefined;
        size?: "xs" | "s" | "m" | "l" | "xl" | "xxl" | undefined;
        color?: Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            range: "absolute";
            palette: string;
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "distributed_palette";
            palette: "temperature" | "complementary" | "status" | "gray" | "warm" | "positive" | "cool" | "negative";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
            to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        labels?: Readonly<{} & {
            alignment: "top" | "bottom";
        }> | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        apply_color_to?: "value" | "background" | undefined;
    } & {
        field: string;
        operation: "unique_count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            language: "lucene" | "kql";
            expression: string;
        }> | undefined;
        values?: Readonly<{} & {
            alignment: "center" | "left" | "right";
        }> | undefined;
        size?: "xs" | "s" | "m" | "l" | "xl" | "xxl" | undefined;
        color?: Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            range: "absolute";
            palette: string;
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "distributed_palette";
            palette: "temperature" | "complementary" | "status" | "gray" | "warm" | "positive" | "cool" | "negative";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
            to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        labels?: Readonly<{} & {
            alignment: "top" | "bottom";
        }> | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        apply_color_to?: "value" | "background" | undefined;
    } & {
        field: string;
        operation: "max" | "min" | "median" | "average" | "standard_deviation";
    }> | Readonly<{
        filter?: Readonly<{} & {
            language: "lucene" | "kql";
            expression: string;
        }> | undefined;
        values?: Readonly<{} & {
            alignment: "center" | "left" | "right";
        }> | undefined;
        size?: "xs" | "s" | "m" | "l" | "xl" | "xxl" | undefined;
        color?: Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            range: "absolute";
            palette: string;
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "distributed_palette";
            palette: "temperature" | "complementary" | "status" | "gray" | "warm" | "positive" | "cool" | "negative";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
            to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        labels?: Readonly<{} & {
            alignment: "top" | "bottom";
        }> | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        apply_color_to?: "value" | "background" | undefined;
    } & {
        field: string;
        operation: "sum";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            language: "lucene" | "kql";
            expression: string;
        }> | undefined;
        values?: Readonly<{} & {
            alignment: "center" | "left" | "right";
        }> | undefined;
        size?: "xs" | "s" | "m" | "l" | "xl" | "xxl" | undefined;
        color?: Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            range: "absolute";
            palette: string;
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "distributed_palette";
            palette: "temperature" | "complementary" | "status" | "gray" | "warm" | "positive" | "cool" | "negative";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
            to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        labels?: Readonly<{} & {
            alignment: "top" | "bottom";
        }> | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        apply_color_to?: "value" | "background" | undefined;
    } & {
        field: string;
        operation: "last_value";
        time_field: string;
        multi_value: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            language: "lucene" | "kql";
            expression: string;
        }> | undefined;
        values?: Readonly<{} & {
            alignment: "center" | "left" | "right";
        }> | undefined;
        size?: "xs" | "s" | "m" | "l" | "xl" | "xxl" | undefined;
        color?: Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            range: "absolute";
            palette: string;
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "distributed_palette";
            palette: "temperature" | "complementary" | "status" | "gray" | "warm" | "positive" | "cool" | "negative";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
            to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        labels?: Readonly<{} & {
            alignment: "top" | "bottom";
        }> | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        apply_color_to?: "value" | "background" | undefined;
    } & {
        field: string;
        percentile: number;
        operation: "percentile";
    }> | Readonly<{
        filter?: Readonly<{} & {
            language: "lucene" | "kql";
            expression: string;
        }> | undefined;
        values?: Readonly<{} & {
            alignment: "center" | "left" | "right";
        }> | undefined;
        size?: "xs" | "s" | "m" | "l" | "xl" | "xxl" | undefined;
        color?: Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            range: "absolute";
            palette: string;
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "distributed_palette";
            palette: "temperature" | "complementary" | "status" | "gray" | "warm" | "positive" | "cool" | "negative";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
            to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        labels?: Readonly<{} & {
            alignment: "top" | "bottom";
        }> | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        apply_color_to?: "value" | "background" | undefined;
    } & {
        field: string;
        rank: number;
        operation: "percentile_rank";
    }> | Readonly<{
        filter?: Readonly<{} & {
            language: "lucene" | "kql";
            expression: string;
        }> | undefined;
        values?: Readonly<{} & {
            alignment: "center" | "left" | "right";
        }> | undefined;
        size?: "xs" | "s" | "m" | "l" | "xl" | "xxl" | undefined;
        color?: Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            range: "absolute";
            palette: string;
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "distributed_palette";
            palette: "temperature" | "complementary" | "status" | "gray" | "warm" | "positive" | "cool" | "negative";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
            to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        labels?: Readonly<{} & {
            alignment: "top" | "bottom";
        }> | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        reduced_time_range?: string | undefined;
        apply_color_to?: "value" | "background" | undefined;
    } & {
        operation: "formula";
        formula: string;
    }>>;
    data_source: import("@kbn/config-schema").Type<import("@kbn/config-schema/src/types").ObjectResultUnionType<{
        type: import("@kbn/config-schema").Type<"data_view_reference">;
        ref_id: import("@kbn/config-schema").Type<string>;
    } | {
        name: import("@kbn/config-schema").Type<string | undefined>;
        type: import("@kbn/config-schema").Type<"data_view_spec">;
        index_pattern: import("@kbn/config-schema").Type<string>;
        time_field: import("@kbn/config-schema").Type<string | undefined>;
        allow_hidden_indices: import("@kbn/config-schema").Type<boolean | undefined>;
        field_settings: import("@kbn/config-schema").Type<Record<string, Readonly<{
            format?: Readonly<{
                params?: any;
            } & {
                type: string;
            }> | undefined;
            custom_label?: string | undefined;
            custom_description?: string | undefined;
        } & {}> | Readonly<{
            script?: string | undefined;
            format?: Readonly<{
                params?: any;
            } & {
                type: string;
            }> | undefined;
            custom_label?: string | undefined;
            custom_description?: string | undefined;
        } & {
            type: "boolean" | "ip" | "date" | "geo_point" | "double" | "keyword" | "long";
        }> | Readonly<{
            script?: string | undefined;
        } & {
            type: "composite";
            fields: Record<string, Readonly<{
                format?: Readonly<{
                    params?: any;
                } & {
                    type: string;
                }> | undefined;
                custom_label?: string | undefined;
                custom_description?: string | undefined;
            } & {
                type: "boolean" | "ip" | "date" | "geo_point" | "double" | "keyword" | "long";
            }>>;
        }>> | undefined>;
    }>>;
    ignore_global_filters: import("@kbn/config-schema").Type<boolean>;
    sampling: import("@kbn/config-schema").Type<number>;
    query: import("@kbn/config-schema").Type<Readonly<{} & {
        language: "lucene" | "kql";
        expression: string;
    }> | undefined>;
    title: import("@kbn/config-schema").Type<string | undefined>;
    description: import("@kbn/config-schema").Type<string | undefined>;
    filters: import("@kbn/config-schema").Type<import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
        disabled: import("@kbn/config-schema").Type<boolean | undefined>;
        negate: import("@kbn/config-schema").Type<boolean | undefined>;
        controlled_by: import("@kbn/config-schema").Type<string | undefined>;
        data_view_id: import("@kbn/config-schema").Type<string | undefined>;
        label: import("@kbn/config-schema").Type<string | undefined>;
        is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
    }, "type" | "condition"> & {
        type: import("@kbn/config-schema").Type<"condition">;
        condition: import("@kbn/config-schema").Type<import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
            field: import("@kbn/config-schema").Type<string>;
            negate: import("@kbn/config-schema").Type<boolean | undefined>;
        }, "value" | "operator"> & {
            value: import("@kbn/config-schema").Type<string | number | boolean>;
            operator: import("@kbn/config-schema").Type<"is">;
        }) | (Omit<{
            field: import("@kbn/config-schema").Type<string>;
            negate: import("@kbn/config-schema").Type<boolean | undefined>;
        }, "value" | "operator"> & {
            value: import("@kbn/config-schema").Type<number[] | string[] | boolean[]>;
            operator: import("@kbn/config-schema").Type<"is_one_of">;
        }) | (Omit<{
            field: import("@kbn/config-schema").Type<string>;
            negate: import("@kbn/config-schema").Type<boolean | undefined>;
        }, "value" | "operator"> & {
            value: import("@kbn/config-schema").ObjectType<{
                gte: import("@kbn/config-schema").Type<string | number | undefined>;
                lte: import("@kbn/config-schema").Type<string | number | undefined>;
                gt: import("@kbn/config-schema").Type<string | number | undefined>;
                lt: import("@kbn/config-schema").Type<string | number | undefined>;
                format: import("@kbn/config-schema").Type<string | undefined>;
            }>;
            operator: import("@kbn/config-schema").Type<"range">;
        }) | (Omit<{
            field: import("@kbn/config-schema").Type<string>;
            negate: import("@kbn/config-schema").Type<boolean | undefined>;
        }, "operator"> & {
            operator: import("@kbn/config-schema").Type<"exists">;
        })>>;
    }) | (Omit<{
        disabled: import("@kbn/config-schema").Type<boolean | undefined>;
        negate: import("@kbn/config-schema").Type<boolean | undefined>;
        controlled_by: import("@kbn/config-schema").Type<string | undefined>;
        data_view_id: import("@kbn/config-schema").Type<string | undefined>;
        label: import("@kbn/config-schema").Type<string | undefined>;
        is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
    }, "type" | "group"> & {
        type: import("@kbn/config-schema").Type<"group">;
        group: import("@kbn/config-schema").ObjectType<{
            operator: import("@kbn/config-schema").Type<"and" | "or">;
            conditions: import("@kbn/config-schema").Type<(import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
                field: import("@kbn/config-schema").Type<string>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "value" | "operator"> & {
                value: import("@kbn/config-schema").Type<string | number | boolean>;
                operator: import("@kbn/config-schema").Type<"is">;
            }) | (Omit<{
                field: import("@kbn/config-schema").Type<string>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "value" | "operator"> & {
                value: import("@kbn/config-schema").Type<number[] | string[] | boolean[]>;
                operator: import("@kbn/config-schema").Type<"is_one_of">;
            }) | (Omit<{
                field: import("@kbn/config-schema").Type<string>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "value" | "operator"> & {
                value: import("@kbn/config-schema").ObjectType<{
                    gte: import("@kbn/config-schema").Type<string | number | undefined>;
                    lte: import("@kbn/config-schema").Type<string | number | undefined>;
                    gt: import("@kbn/config-schema").Type<string | number | undefined>;
                    lt: import("@kbn/config-schema").Type<string | number | undefined>;
                    format: import("@kbn/config-schema").Type<string | undefined>;
                }>;
                operator: import("@kbn/config-schema").Type<"range">;
            }) | (Omit<{
                field: import("@kbn/config-schema").Type<string>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "operator"> & {
                operator: import("@kbn/config-schema").Type<"exists">;
            })> | import("@kbn/as-code-filters-schema").AsCodeGroupFilterRecursive)[]>;
        }>;
    }) | (Omit<{
        disabled: import("@kbn/config-schema").Type<boolean | undefined>;
        negate: import("@kbn/config-schema").Type<boolean | undefined>;
        controlled_by: import("@kbn/config-schema").Type<string | undefined>;
        data_view_id: import("@kbn/config-schema").Type<string | undefined>;
        label: import("@kbn/config-schema").Type<string | undefined>;
        is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
    }, "type" | "params" | "field" | "dsl"> & {
        type: import("@kbn/config-schema").Type<"dsl">;
        params: import("@kbn/config-schema").Type<any>;
        field: import("@kbn/config-schema").Type<string | undefined>;
        dsl: import("@kbn/config-schema").Type<Record<string, any>>;
    }) | (Omit<{
        disabled: import("@kbn/config-schema").Type<boolean | undefined>;
        negate: import("@kbn/config-schema").Type<boolean | undefined>;
        controlled_by: import("@kbn/config-schema").Type<string | undefined>;
        data_view_id: import("@kbn/config-schema").Type<string | undefined>;
        label: import("@kbn/config-schema").Type<string | undefined>;
        is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
    }, "type" | "dsl"> & {
        type: import("@kbn/config-schema").Type<"spatial">;
        dsl: import("@kbn/config-schema").Type<Record<string, any>>;
    })>[] | undefined>;
    type: import("@kbn/config-schema").Type<"legacy_metric">;
}>], Readonly<{
    description?: string | undefined;
    title?: string | undefined;
    query?: Readonly<{} & {
        language: "lucene" | "kql";
        expression: string;
    }> | undefined;
    filters?: import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
        disabled: import("@kbn/config-schema").Type<boolean | undefined>;
        negate: import("@kbn/config-schema").Type<boolean | undefined>;
        controlled_by: import("@kbn/config-schema").Type<string | undefined>;
        data_view_id: import("@kbn/config-schema").Type<string | undefined>;
        label: import("@kbn/config-schema").Type<string | undefined>;
        is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
    }, "type" | "condition"> & {
        type: import("@kbn/config-schema").Type<"condition">;
        condition: import("@kbn/config-schema").Type<import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
            field: import("@kbn/config-schema").Type<string>;
            negate: import("@kbn/config-schema").Type<boolean | undefined>;
        }, "value" | "operator"> & {
            value: import("@kbn/config-schema").Type<string | number | boolean>;
            operator: import("@kbn/config-schema").Type<"is">;
        }) | (Omit<{
            field: import("@kbn/config-schema").Type<string>;
            negate: import("@kbn/config-schema").Type<boolean | undefined>;
        }, "value" | "operator"> & {
            value: import("@kbn/config-schema").Type<number[] | string[] | boolean[]>;
            operator: import("@kbn/config-schema").Type<"is_one_of">;
        }) | (Omit<{
            field: import("@kbn/config-schema").Type<string>;
            negate: import("@kbn/config-schema").Type<boolean | undefined>;
        }, "value" | "operator"> & {
            value: import("@kbn/config-schema").ObjectType<{
                gte: import("@kbn/config-schema").Type<string | number | undefined>;
                lte: import("@kbn/config-schema").Type<string | number | undefined>;
                gt: import("@kbn/config-schema").Type<string | number | undefined>;
                lt: import("@kbn/config-schema").Type<string | number | undefined>;
                format: import("@kbn/config-schema").Type<string | undefined>;
            }>;
            operator: import("@kbn/config-schema").Type<"range">;
        }) | (Omit<{
            field: import("@kbn/config-schema").Type<string>;
            negate: import("@kbn/config-schema").Type<boolean | undefined>;
        }, "operator"> & {
            operator: import("@kbn/config-schema").Type<"exists">;
        })>>;
    }) | (Omit<{
        disabled: import("@kbn/config-schema").Type<boolean | undefined>;
        negate: import("@kbn/config-schema").Type<boolean | undefined>;
        controlled_by: import("@kbn/config-schema").Type<string | undefined>;
        data_view_id: import("@kbn/config-schema").Type<string | undefined>;
        label: import("@kbn/config-schema").Type<string | undefined>;
        is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
    }, "type" | "group"> & {
        type: import("@kbn/config-schema").Type<"group">;
        group: import("@kbn/config-schema").ObjectType<{
            operator: import("@kbn/config-schema").Type<"and" | "or">;
            conditions: import("@kbn/config-schema").Type<(import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
                field: import("@kbn/config-schema").Type<string>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "value" | "operator"> & {
                value: import("@kbn/config-schema").Type<string | number | boolean>;
                operator: import("@kbn/config-schema").Type<"is">;
            }) | (Omit<{
                field: import("@kbn/config-schema").Type<string>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "value" | "operator"> & {
                value: import("@kbn/config-schema").Type<number[] | string[] | boolean[]>;
                operator: import("@kbn/config-schema").Type<"is_one_of">;
            }) | (Omit<{
                field: import("@kbn/config-schema").Type<string>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "value" | "operator"> & {
                value: import("@kbn/config-schema").ObjectType<{
                    gte: import("@kbn/config-schema").Type<string | number | undefined>;
                    lte: import("@kbn/config-schema").Type<string | number | undefined>;
                    gt: import("@kbn/config-schema").Type<string | number | undefined>;
                    lt: import("@kbn/config-schema").Type<string | number | undefined>;
                    format: import("@kbn/config-schema").Type<string | undefined>;
                }>;
                operator: import("@kbn/config-schema").Type<"range">;
            }) | (Omit<{
                field: import("@kbn/config-schema").Type<string>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "operator"> & {
                operator: import("@kbn/config-schema").Type<"exists">;
            })> | import("@kbn/as-code-filters-schema").AsCodeGroupFilterRecursive)[]>;
        }>;
    }) | (Omit<{
        disabled: import("@kbn/config-schema").Type<boolean | undefined>;
        negate: import("@kbn/config-schema").Type<boolean | undefined>;
        controlled_by: import("@kbn/config-schema").Type<string | undefined>;
        data_view_id: import("@kbn/config-schema").Type<string | undefined>;
        label: import("@kbn/config-schema").Type<string | undefined>;
        is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
    }, "type" | "params" | "field" | "dsl"> & {
        type: import("@kbn/config-schema").Type<"dsl">;
        params: import("@kbn/config-schema").Type<any>;
        field: import("@kbn/config-schema").Type<string | undefined>;
        dsl: import("@kbn/config-schema").Type<Record<string, any>>;
    }) | (Omit<{
        disabled: import("@kbn/config-schema").Type<boolean | undefined>;
        negate: import("@kbn/config-schema").Type<boolean | undefined>;
        controlled_by: import("@kbn/config-schema").Type<string | undefined>;
        data_view_id: import("@kbn/config-schema").Type<string | undefined>;
        label: import("@kbn/config-schema").Type<string | undefined>;
        is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
    }, "type" | "dsl"> & {
        type: import("@kbn/config-schema").Type<"spatial">;
        dsl: import("@kbn/config-schema").Type<Record<string, any>>;
    })>[] | undefined;
} & {
    type: "legacy_metric";
    data_source: import("@kbn/config-schema/src/types").ObjectResultUnionType<{
        type: import("@kbn/config-schema").Type<"data_view_reference">;
        ref_id: import("@kbn/config-schema").Type<string>;
    } | {
        name: import("@kbn/config-schema").Type<string | undefined>;
        type: import("@kbn/config-schema").Type<"data_view_spec">;
        index_pattern: import("@kbn/config-schema").Type<string>;
        time_field: import("@kbn/config-schema").Type<string | undefined>;
        allow_hidden_indices: import("@kbn/config-schema").Type<boolean | undefined>;
        field_settings: import("@kbn/config-schema").Type<Record<string, Readonly<{
            format?: Readonly<{
                params?: any;
            } & {
                type: string;
            }> | undefined;
            custom_label?: string | undefined;
            custom_description?: string | undefined;
        } & {}> | Readonly<{
            script?: string | undefined;
            format?: Readonly<{
                params?: any;
            } & {
                type: string;
            }> | undefined;
            custom_label?: string | undefined;
            custom_description?: string | undefined;
        } & {
            type: "boolean" | "ip" | "date" | "geo_point" | "double" | "keyword" | "long";
        }> | Readonly<{
            script?: string | undefined;
        } & {
            type: "composite";
            fields: Record<string, Readonly<{
                format?: Readonly<{
                    params?: any;
                } & {
                    type: string;
                }> | undefined;
                custom_label?: string | undefined;
                custom_description?: string | undefined;
            } & {
                type: "boolean" | "ip" | "date" | "geo_point" | "double" | "keyword" | "long";
            }>>;
        }>> | undefined>;
    }>;
    sampling: number;
    metric: Readonly<{
        filter?: Readonly<{} & {
            language: "lucene" | "kql";
            expression: string;
        }> | undefined;
        values?: Readonly<{} & {
            alignment: "center" | "left" | "right";
        }> | undefined;
        size?: "xs" | "s" | "m" | "l" | "xl" | "xxl" | undefined;
        field?: string | undefined;
        color?: Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            range: "absolute";
            palette: string;
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "distributed_palette";
            palette: "temperature" | "complementary" | "status" | "gray" | "warm" | "positive" | "cool" | "negative";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
            to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        labels?: Readonly<{} & {
            alignment: "top" | "bottom";
        }> | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        apply_color_to?: "value" | "background" | undefined;
    } & {
        operation: "count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            language: "lucene" | "kql";
            expression: string;
        }> | undefined;
        values?: Readonly<{} & {
            alignment: "center" | "left" | "right";
        }> | undefined;
        size?: "xs" | "s" | "m" | "l" | "xl" | "xxl" | undefined;
        color?: Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            range: "absolute";
            palette: string;
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "distributed_palette";
            palette: "temperature" | "complementary" | "status" | "gray" | "warm" | "positive" | "cool" | "negative";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
            to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        labels?: Readonly<{} & {
            alignment: "top" | "bottom";
        }> | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        apply_color_to?: "value" | "background" | undefined;
    } & {
        field: string;
        operation: "unique_count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            language: "lucene" | "kql";
            expression: string;
        }> | undefined;
        values?: Readonly<{} & {
            alignment: "center" | "left" | "right";
        }> | undefined;
        size?: "xs" | "s" | "m" | "l" | "xl" | "xxl" | undefined;
        color?: Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            range: "absolute";
            palette: string;
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "distributed_palette";
            palette: "temperature" | "complementary" | "status" | "gray" | "warm" | "positive" | "cool" | "negative";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
            to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        labels?: Readonly<{} & {
            alignment: "top" | "bottom";
        }> | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        apply_color_to?: "value" | "background" | undefined;
    } & {
        field: string;
        operation: "max" | "min" | "median" | "average" | "standard_deviation";
    }> | Readonly<{
        filter?: Readonly<{} & {
            language: "lucene" | "kql";
            expression: string;
        }> | undefined;
        values?: Readonly<{} & {
            alignment: "center" | "left" | "right";
        }> | undefined;
        size?: "xs" | "s" | "m" | "l" | "xl" | "xxl" | undefined;
        color?: Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            range: "absolute";
            palette: string;
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "distributed_palette";
            palette: "temperature" | "complementary" | "status" | "gray" | "warm" | "positive" | "cool" | "negative";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
            to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        labels?: Readonly<{} & {
            alignment: "top" | "bottom";
        }> | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        apply_color_to?: "value" | "background" | undefined;
    } & {
        field: string;
        operation: "sum";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            language: "lucene" | "kql";
            expression: string;
        }> | undefined;
        values?: Readonly<{} & {
            alignment: "center" | "left" | "right";
        }> | undefined;
        size?: "xs" | "s" | "m" | "l" | "xl" | "xxl" | undefined;
        color?: Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            range: "absolute";
            palette: string;
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "distributed_palette";
            palette: "temperature" | "complementary" | "status" | "gray" | "warm" | "positive" | "cool" | "negative";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
            to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        labels?: Readonly<{} & {
            alignment: "top" | "bottom";
        }> | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        apply_color_to?: "value" | "background" | undefined;
    } & {
        field: string;
        operation: "last_value";
        time_field: string;
        multi_value: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            language: "lucene" | "kql";
            expression: string;
        }> | undefined;
        values?: Readonly<{} & {
            alignment: "center" | "left" | "right";
        }> | undefined;
        size?: "xs" | "s" | "m" | "l" | "xl" | "xxl" | undefined;
        color?: Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            range: "absolute";
            palette: string;
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "distributed_palette";
            palette: "temperature" | "complementary" | "status" | "gray" | "warm" | "positive" | "cool" | "negative";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
            to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        labels?: Readonly<{} & {
            alignment: "top" | "bottom";
        }> | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        apply_color_to?: "value" | "background" | undefined;
    } & {
        field: string;
        percentile: number;
        operation: "percentile";
    }> | Readonly<{
        filter?: Readonly<{} & {
            language: "lucene" | "kql";
            expression: string;
        }> | undefined;
        values?: Readonly<{} & {
            alignment: "center" | "left" | "right";
        }> | undefined;
        size?: "xs" | "s" | "m" | "l" | "xl" | "xxl" | undefined;
        color?: Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            range: "absolute";
            palette: string;
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "distributed_palette";
            palette: "temperature" | "complementary" | "status" | "gray" | "warm" | "positive" | "cool" | "negative";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
            to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        labels?: Readonly<{} & {
            alignment: "top" | "bottom";
        }> | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        apply_color_to?: "value" | "background" | undefined;
    } & {
        field: string;
        rank: number;
        operation: "percentile_rank";
    }> | Readonly<{
        filter?: Readonly<{} & {
            language: "lucene" | "kql";
            expression: string;
        }> | undefined;
        values?: Readonly<{} & {
            alignment: "center" | "left" | "right";
        }> | undefined;
        size?: "xs" | "s" | "m" | "l" | "xl" | "xxl" | undefined;
        color?: Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            range: "absolute";
            palette: string;
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "distributed_palette";
            palette: "temperature" | "complementary" | "status" | "gray" | "warm" | "positive" | "cool" | "negative";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
            to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        labels?: Readonly<{} & {
            alignment: "top" | "bottom";
        }> | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        reduced_time_range?: string | undefined;
        apply_color_to?: "value" | "background" | undefined;
    } & {
        operation: "formula";
        formula: string;
    }>;
    ignore_global_filters: boolean;
}>>;
export type LegacyMetricConfig = TypeOf<typeof legacyMetricConfigSchema>;
export type LegacyMetricConfigNoESQL = TypeOf<typeof legacyMetricConfigSchemaNoESQL>;
export type LegacyMetricConfigESQL = TypeOf<typeof esqlLegacyMetricConfig>;
export {};
