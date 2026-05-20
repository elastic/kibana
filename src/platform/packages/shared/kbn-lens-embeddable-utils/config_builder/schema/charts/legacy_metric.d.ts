import type { TypeOf } from '@kbn/config-schema';
export declare const legacyMetricConfigSchemaNoESQL: import("@kbn/config-schema").ObjectType<{
    /**
     * Metric configuration, must define operation.
     */
    metric: import("@kbn/config-schema").Type<Readonly<{
        labels?: Readonly<{} & {
            alignment: "top" | "bottom";
        }> | undefined;
        color?: Readonly<{} & {
            type: "legacy_dynamic";
            palette: string;
            shift: boolean;
            range: "absolute";
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
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
        }> | undefined;
        values?: Readonly<{} & {
            alignment: "center" | "left" | "right";
        }> | undefined;
        label?: string | undefined;
        field?: string | undefined;
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        size?: "s" | "m" | "xs" | "l" | "xl" | "xxl" | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        apply_color_to?: "background" | "value" | undefined;
    } & {
        operation: "count";
        empty_as_null: boolean;
    }> | Readonly<{
        labels?: Readonly<{} & {
            alignment: "top" | "bottom";
        }> | undefined;
        color?: Readonly<{} & {
            type: "legacy_dynamic";
            palette: string;
            shift: boolean;
            range: "absolute";
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
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
        }> | undefined;
        values?: Readonly<{} & {
            alignment: "center" | "left" | "right";
        }> | undefined;
        label?: string | undefined;
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        size?: "s" | "m" | "xs" | "l" | "xl" | "xxl" | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        apply_color_to?: "background" | "value" | undefined;
    } & {
        field: string;
        operation: "unique_count";
        empty_as_null: boolean;
    }> | Readonly<{
        labels?: Readonly<{} & {
            alignment: "top" | "bottom";
        }> | undefined;
        color?: Readonly<{} & {
            type: "legacy_dynamic";
            palette: string;
            shift: boolean;
            range: "absolute";
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
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
        }> | undefined;
        values?: Readonly<{} & {
            alignment: "center" | "left" | "right";
        }> | undefined;
        label?: string | undefined;
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        size?: "s" | "m" | "xs" | "l" | "xl" | "xxl" | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        apply_color_to?: "background" | "value" | undefined;
    } & {
        field: string;
        operation: "min" | "max" | "average" | "median" | "standard_deviation";
    }> | Readonly<{
        labels?: Readonly<{} & {
            alignment: "top" | "bottom";
        }> | undefined;
        color?: Readonly<{} & {
            type: "legacy_dynamic";
            palette: string;
            shift: boolean;
            range: "absolute";
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
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
        }> | undefined;
        values?: Readonly<{} & {
            alignment: "center" | "left" | "right";
        }> | undefined;
        label?: string | undefined;
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        size?: "s" | "m" | "xs" | "l" | "xl" | "xxl" | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        apply_color_to?: "background" | "value" | undefined;
    } & {
        field: string;
        operation: "sum";
        empty_as_null: boolean;
    }> | Readonly<{
        labels?: Readonly<{} & {
            alignment: "top" | "bottom";
        }> | undefined;
        color?: Readonly<{} & {
            type: "legacy_dynamic";
            palette: string;
            shift: boolean;
            range: "absolute";
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
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
        }> | undefined;
        values?: Readonly<{} & {
            alignment: "center" | "left" | "right";
        }> | undefined;
        label?: string | undefined;
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        size?: "s" | "m" | "xs" | "l" | "xl" | "xxl" | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        apply_color_to?: "background" | "value" | undefined;
    } & {
        field: string;
        operation: "last_value";
        time_field: string;
        multi_value: boolean;
    }> | Readonly<{
        labels?: Readonly<{} & {
            alignment: "top" | "bottom";
        }> | undefined;
        color?: Readonly<{} & {
            type: "legacy_dynamic";
            palette: string;
            shift: boolean;
            range: "absolute";
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
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
        }> | undefined;
        values?: Readonly<{} & {
            alignment: "center" | "left" | "right";
        }> | undefined;
        label?: string | undefined;
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        size?: "s" | "m" | "xs" | "l" | "xl" | "xxl" | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        apply_color_to?: "background" | "value" | undefined;
    } & {
        field: string;
        percentile: number;
        operation: "percentile";
    }> | Readonly<{
        labels?: Readonly<{} & {
            alignment: "top" | "bottom";
        }> | undefined;
        color?: Readonly<{} & {
            type: "legacy_dynamic";
            palette: string;
            shift: boolean;
            range: "absolute";
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
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
        }> | undefined;
        values?: Readonly<{} & {
            alignment: "center" | "left" | "right";
        }> | undefined;
        label?: string | undefined;
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        size?: "s" | "m" | "xs" | "l" | "xl" | "xxl" | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        apply_color_to?: "background" | "value" | undefined;
    } & {
        field: string;
        rank: number;
        operation: "percentile_rank";
    }> | Readonly<{
        labels?: Readonly<{} & {
            alignment: "top" | "bottom";
        }> | undefined;
        color?: Readonly<{} & {
            type: "legacy_dynamic";
            palette: string;
            shift: boolean;
            range: "absolute";
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
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
        }> | undefined;
        values?: Readonly<{} & {
            alignment: "center" | "left" | "right";
        }> | undefined;
        label?: string | undefined;
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        size?: "s" | "m" | "xs" | "l" | "xl" | "xxl" | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        apply_color_to?: "background" | "value" | undefined;
    } & {
        formula: string;
        operation: "formula";
    }>>;
    data_source: import("@kbn/config-schema").Type<import("@kbn/config-schema/src/types").ObjectResultUnionType<{
        type: import("@kbn/config-schema").Type<"data_view_reference">;
        ref_id: import("@kbn/config-schema").Type<string>;
    } | {
        type: import("@kbn/config-schema").Type<"data_view_spec">;
        index_pattern: import("@kbn/config-schema").Type<string>;
        time_field: import("@kbn/config-schema").Type<string | undefined>;
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
            type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "geo_point";
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
                type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "geo_point";
            }>>;
        }>> | undefined>;
    }>>;
    ignore_global_filters: import("@kbn/config-schema").Type<boolean>;
    sampling: import("@kbn/config-schema").Type<number>;
    query: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "kql" | "lucene";
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
            value: import("@kbn/config-schema").Type<string[] | number[] | boolean[]>;
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
                value: import("@kbn/config-schema").Type<string[] | number[] | boolean[]>;
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
    }, "type" | "field" | "params" | "dsl"> & {
        type: import("@kbn/config-schema").Type<"dsl">;
        field: import("@kbn/config-schema").Type<string | undefined>;
        params: import("@kbn/config-schema").Type<any>;
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
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined>;
    }, "labels" | "color" | "values" | "size" | "apply_color_to"> & {
        labels: import("@kbn/config-schema").Type<Readonly<{} & {
            alignment: "top" | "bottom";
        }> | undefined>;
        color: import("@kbn/config-schema").Type<Readonly<{} & {
            type: "legacy_dynamic";
            palette: string;
            shift: boolean;
            range: "absolute";
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
            type: "auto";
        }> | undefined>;
        values: import("@kbn/config-schema").Type<Readonly<{} & {
            alignment: "center" | "left" | "right";
        }> | undefined>;
        size: import("@kbn/config-schema").Type<"s" | "m" | "xs" | "l" | "xl" | "xxl" | undefined>;
        apply_color_to: import("@kbn/config-schema").Type<"background" | "value" | undefined>;
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
            value: import("@kbn/config-schema").Type<string[] | number[] | boolean[]>;
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
                value: import("@kbn/config-schema").Type<string[] | number[] | boolean[]>;
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
    }, "type" | "field" | "params" | "dsl"> & {
        type: import("@kbn/config-schema").Type<"dsl">;
        field: import("@kbn/config-schema").Type<string | undefined>;
        params: import("@kbn/config-schema").Type<any>;
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
        labels?: Readonly<{} & {
            alignment: "top" | "bottom";
        }> | undefined;
        color?: Readonly<{} & {
            type: "legacy_dynamic";
            palette: string;
            shift: boolean;
            range: "absolute";
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
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
        }> | undefined;
        values?: Readonly<{} & {
            alignment: "center" | "left" | "right";
        }> | undefined;
        label?: string | undefined;
        field?: string | undefined;
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        size?: "s" | "m" | "xs" | "l" | "xl" | "xxl" | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        apply_color_to?: "background" | "value" | undefined;
    } & {
        operation: "count";
        empty_as_null: boolean;
    }> | Readonly<{
        labels?: Readonly<{} & {
            alignment: "top" | "bottom";
        }> | undefined;
        color?: Readonly<{} & {
            type: "legacy_dynamic";
            palette: string;
            shift: boolean;
            range: "absolute";
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
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
        }> | undefined;
        values?: Readonly<{} & {
            alignment: "center" | "left" | "right";
        }> | undefined;
        label?: string | undefined;
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        size?: "s" | "m" | "xs" | "l" | "xl" | "xxl" | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        apply_color_to?: "background" | "value" | undefined;
    } & {
        field: string;
        operation: "unique_count";
        empty_as_null: boolean;
    }> | Readonly<{
        labels?: Readonly<{} & {
            alignment: "top" | "bottom";
        }> | undefined;
        color?: Readonly<{} & {
            type: "legacy_dynamic";
            palette: string;
            shift: boolean;
            range: "absolute";
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
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
        }> | undefined;
        values?: Readonly<{} & {
            alignment: "center" | "left" | "right";
        }> | undefined;
        label?: string | undefined;
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        size?: "s" | "m" | "xs" | "l" | "xl" | "xxl" | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        apply_color_to?: "background" | "value" | undefined;
    } & {
        field: string;
        operation: "min" | "max" | "average" | "median" | "standard_deviation";
    }> | Readonly<{
        labels?: Readonly<{} & {
            alignment: "top" | "bottom";
        }> | undefined;
        color?: Readonly<{} & {
            type: "legacy_dynamic";
            palette: string;
            shift: boolean;
            range: "absolute";
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
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
        }> | undefined;
        values?: Readonly<{} & {
            alignment: "center" | "left" | "right";
        }> | undefined;
        label?: string | undefined;
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        size?: "s" | "m" | "xs" | "l" | "xl" | "xxl" | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        apply_color_to?: "background" | "value" | undefined;
    } & {
        field: string;
        operation: "sum";
        empty_as_null: boolean;
    }> | Readonly<{
        labels?: Readonly<{} & {
            alignment: "top" | "bottom";
        }> | undefined;
        color?: Readonly<{} & {
            type: "legacy_dynamic";
            palette: string;
            shift: boolean;
            range: "absolute";
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
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
        }> | undefined;
        values?: Readonly<{} & {
            alignment: "center" | "left" | "right";
        }> | undefined;
        label?: string | undefined;
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        size?: "s" | "m" | "xs" | "l" | "xl" | "xxl" | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        apply_color_to?: "background" | "value" | undefined;
    } & {
        field: string;
        operation: "last_value";
        time_field: string;
        multi_value: boolean;
    }> | Readonly<{
        labels?: Readonly<{} & {
            alignment: "top" | "bottom";
        }> | undefined;
        color?: Readonly<{} & {
            type: "legacy_dynamic";
            palette: string;
            shift: boolean;
            range: "absolute";
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
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
        }> | undefined;
        values?: Readonly<{} & {
            alignment: "center" | "left" | "right";
        }> | undefined;
        label?: string | undefined;
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        size?: "s" | "m" | "xs" | "l" | "xl" | "xxl" | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        apply_color_to?: "background" | "value" | undefined;
    } & {
        field: string;
        percentile: number;
        operation: "percentile";
    }> | Readonly<{
        labels?: Readonly<{} & {
            alignment: "top" | "bottom";
        }> | undefined;
        color?: Readonly<{} & {
            type: "legacy_dynamic";
            palette: string;
            shift: boolean;
            range: "absolute";
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
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
        }> | undefined;
        values?: Readonly<{} & {
            alignment: "center" | "left" | "right";
        }> | undefined;
        label?: string | undefined;
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        size?: "s" | "m" | "xs" | "l" | "xl" | "xxl" | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        apply_color_to?: "background" | "value" | undefined;
    } & {
        field: string;
        rank: number;
        operation: "percentile_rank";
    }> | Readonly<{
        labels?: Readonly<{} & {
            alignment: "top" | "bottom";
        }> | undefined;
        color?: Readonly<{} & {
            type: "legacy_dynamic";
            palette: string;
            shift: boolean;
            range: "absolute";
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
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
        }> | undefined;
        values?: Readonly<{} & {
            alignment: "center" | "left" | "right";
        }> | undefined;
        label?: string | undefined;
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        size?: "s" | "m" | "xs" | "l" | "xl" | "xxl" | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        apply_color_to?: "background" | "value" | undefined;
    } & {
        formula: string;
        operation: "formula";
    }>>;
    data_source: import("@kbn/config-schema").Type<import("@kbn/config-schema/src/types").ObjectResultUnionType<{
        type: import("@kbn/config-schema").Type<"data_view_reference">;
        ref_id: import("@kbn/config-schema").Type<string>;
    } | {
        type: import("@kbn/config-schema").Type<"data_view_spec">;
        index_pattern: import("@kbn/config-schema").Type<string>;
        time_field: import("@kbn/config-schema").Type<string | undefined>;
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
            type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "geo_point";
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
                type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "geo_point";
            }>>;
        }>> | undefined>;
    }>>;
    ignore_global_filters: import("@kbn/config-schema").Type<boolean>;
    sampling: import("@kbn/config-schema").Type<number>;
    query: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "kql" | "lucene";
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
            value: import("@kbn/config-schema").Type<string[] | number[] | boolean[]>;
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
                value: import("@kbn/config-schema").Type<string[] | number[] | boolean[]>;
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
    }, "type" | "field" | "params" | "dsl"> & {
        type: import("@kbn/config-schema").Type<"dsl">;
        field: import("@kbn/config-schema").Type<string | undefined>;
        params: import("@kbn/config-schema").Type<any>;
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
    query?: Readonly<{} & {
        expression: string;
        language: "kql" | "lucene";
    }> | undefined;
    title?: string | undefined;
    description?: string | undefined;
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
            value: import("@kbn/config-schema").Type<string[] | number[] | boolean[]>;
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
                value: import("@kbn/config-schema").Type<string[] | number[] | boolean[]>;
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
    }, "type" | "field" | "params" | "dsl"> & {
        type: import("@kbn/config-schema").Type<"dsl">;
        field: import("@kbn/config-schema").Type<string | undefined>;
        params: import("@kbn/config-schema").Type<any>;
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
    metric: Readonly<{
        labels?: Readonly<{} & {
            alignment: "top" | "bottom";
        }> | undefined;
        color?: Readonly<{} & {
            type: "legacy_dynamic";
            palette: string;
            shift: boolean;
            range: "absolute";
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
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
        }> | undefined;
        values?: Readonly<{} & {
            alignment: "center" | "left" | "right";
        }> | undefined;
        label?: string | undefined;
        field?: string | undefined;
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        size?: "s" | "m" | "xs" | "l" | "xl" | "xxl" | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        apply_color_to?: "background" | "value" | undefined;
    } & {
        operation: "count";
        empty_as_null: boolean;
    }> | Readonly<{
        labels?: Readonly<{} & {
            alignment: "top" | "bottom";
        }> | undefined;
        color?: Readonly<{} & {
            type: "legacy_dynamic";
            palette: string;
            shift: boolean;
            range: "absolute";
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
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
        }> | undefined;
        values?: Readonly<{} & {
            alignment: "center" | "left" | "right";
        }> | undefined;
        label?: string | undefined;
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        size?: "s" | "m" | "xs" | "l" | "xl" | "xxl" | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        apply_color_to?: "background" | "value" | undefined;
    } & {
        field: string;
        operation: "unique_count";
        empty_as_null: boolean;
    }> | Readonly<{
        labels?: Readonly<{} & {
            alignment: "top" | "bottom";
        }> | undefined;
        color?: Readonly<{} & {
            type: "legacy_dynamic";
            palette: string;
            shift: boolean;
            range: "absolute";
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
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
        }> | undefined;
        values?: Readonly<{} & {
            alignment: "center" | "left" | "right";
        }> | undefined;
        label?: string | undefined;
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        size?: "s" | "m" | "xs" | "l" | "xl" | "xxl" | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        apply_color_to?: "background" | "value" | undefined;
    } & {
        field: string;
        operation: "min" | "max" | "average" | "median" | "standard_deviation";
    }> | Readonly<{
        labels?: Readonly<{} & {
            alignment: "top" | "bottom";
        }> | undefined;
        color?: Readonly<{} & {
            type: "legacy_dynamic";
            palette: string;
            shift: boolean;
            range: "absolute";
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
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
        }> | undefined;
        values?: Readonly<{} & {
            alignment: "center" | "left" | "right";
        }> | undefined;
        label?: string | undefined;
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        size?: "s" | "m" | "xs" | "l" | "xl" | "xxl" | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        apply_color_to?: "background" | "value" | undefined;
    } & {
        field: string;
        operation: "sum";
        empty_as_null: boolean;
    }> | Readonly<{
        labels?: Readonly<{} & {
            alignment: "top" | "bottom";
        }> | undefined;
        color?: Readonly<{} & {
            type: "legacy_dynamic";
            palette: string;
            shift: boolean;
            range: "absolute";
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
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
        }> | undefined;
        values?: Readonly<{} & {
            alignment: "center" | "left" | "right";
        }> | undefined;
        label?: string | undefined;
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        size?: "s" | "m" | "xs" | "l" | "xl" | "xxl" | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        apply_color_to?: "background" | "value" | undefined;
    } & {
        field: string;
        operation: "last_value";
        time_field: string;
        multi_value: boolean;
    }> | Readonly<{
        labels?: Readonly<{} & {
            alignment: "top" | "bottom";
        }> | undefined;
        color?: Readonly<{} & {
            type: "legacy_dynamic";
            palette: string;
            shift: boolean;
            range: "absolute";
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
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
        }> | undefined;
        values?: Readonly<{} & {
            alignment: "center" | "left" | "right";
        }> | undefined;
        label?: string | undefined;
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        size?: "s" | "m" | "xs" | "l" | "xl" | "xxl" | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        apply_color_to?: "background" | "value" | undefined;
    } & {
        field: string;
        percentile: number;
        operation: "percentile";
    }> | Readonly<{
        labels?: Readonly<{} & {
            alignment: "top" | "bottom";
        }> | undefined;
        color?: Readonly<{} & {
            type: "legacy_dynamic";
            palette: string;
            shift: boolean;
            range: "absolute";
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
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
        }> | undefined;
        values?: Readonly<{} & {
            alignment: "center" | "left" | "right";
        }> | undefined;
        label?: string | undefined;
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        size?: "s" | "m" | "xs" | "l" | "xl" | "xxl" | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        apply_color_to?: "background" | "value" | undefined;
    } & {
        field: string;
        rank: number;
        operation: "percentile_rank";
    }> | Readonly<{
        labels?: Readonly<{} & {
            alignment: "top" | "bottom";
        }> | undefined;
        color?: Readonly<{} & {
            type: "legacy_dynamic";
            palette: string;
            shift: boolean;
            range: "absolute";
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
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
        }> | undefined;
        values?: Readonly<{} & {
            alignment: "center" | "left" | "right";
        }> | undefined;
        label?: string | undefined;
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        size?: "s" | "m" | "xs" | "l" | "xl" | "xxl" | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        apply_color_to?: "background" | "value" | undefined;
    } & {
        formula: string;
        operation: "formula";
    }>;
    data_source: import("@kbn/config-schema/src/types").ObjectResultUnionType<{
        type: import("@kbn/config-schema").Type<"data_view_reference">;
        ref_id: import("@kbn/config-schema").Type<string>;
    } | {
        type: import("@kbn/config-schema").Type<"data_view_spec">;
        index_pattern: import("@kbn/config-schema").Type<string>;
        time_field: import("@kbn/config-schema").Type<string | undefined>;
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
            type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "geo_point";
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
                type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "geo_point";
            }>>;
        }>> | undefined>;
    }>;
    sampling: number;
    ignore_global_filters: boolean;
}>>;
export type LegacyMetricConfig = TypeOf<typeof legacyMetricConfigSchema>;
export type LegacyMetricConfigNoESQL = TypeOf<typeof legacyMetricConfigSchemaNoESQL>;
export type LegacyMetricConfigESQL = TypeOf<typeof esqlLegacyMetricConfig>;
export {};
