import type { TypeOf } from '@kbn/config-schema';
export declare const datatableConfigSchemaNoESQL: import("@kbn/config-schema").ObjectType<{
    styling: import("@kbn/config-schema").Type<Readonly<{
        sort_by?: Readonly<{} & {
            index: number;
            direction: "desc" | "asc";
            column_type: "metric" | "row";
        }> | Readonly<{} & {
            index: number;
            values: string[];
            direction: "desc" | "asc";
            column_type: "pivoted_metric";
        }> | undefined;
        density?: Readonly<{
            mode?: "default" | "compact" | "expanded" | undefined;
            height?: Readonly<{
                header?: Readonly<{} & {
                    type: "auto";
                }> | Readonly<{} & {
                    type: "custom";
                    max_lines: number;
                }> | undefined;
                value?: Readonly<{} & {
                    type: "auto";
                }> | Readonly<{} & {
                    type: "custom";
                    lines: number;
                }> | undefined;
            } & {}> | undefined;
        } & {}> | undefined;
        paging?: 100 | 10 | 20 | 50 | 30 | undefined;
        row_numbers?: Readonly<{} & {
            visible: boolean;
        }> | undefined;
    } & {}> | undefined>;
    /**
     * Metric columns configuration, must define operation.
     */
    metrics: import("@kbn/config-schema").Type<(Readonly<{
        color?: Readonly<{} & {
            type: "legacy_dynamic";
            palette: string;
            shift: boolean;
            range: "absolute" | "percentage";
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
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mapping: Readonly<{} & {
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[] | undefined;
            sort?: "desc" | "asc" | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            palette: string;
            mode: "gradient";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
        }> | undefined;
        label?: string | undefined;
        summary?: Readonly<{
            label?: string | undefined;
        } & {
            type: "min" | "max" | "count" | "sum" | "avg";
        }> | undefined;
        field?: string | undefined;
        width?: number | undefined;
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
        visible?: boolean | undefined;
        alignment?: "center" | "left" | "right" | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        apply_color_to?: "background" | "value" | "badge" | undefined;
    } & {
        operation: "count";
        empty_as_null: boolean;
    }> | Readonly<{
        color?: Readonly<{} & {
            type: "legacy_dynamic";
            palette: string;
            shift: boolean;
            range: "absolute" | "percentage";
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
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mapping: Readonly<{} & {
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[] | undefined;
            sort?: "desc" | "asc" | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            palette: string;
            mode: "gradient";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
        }> | undefined;
        label?: string | undefined;
        summary?: Readonly<{
            label?: string | undefined;
        } & {
            type: "min" | "max" | "count" | "sum" | "avg";
        }> | undefined;
        width?: number | undefined;
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
        visible?: boolean | undefined;
        alignment?: "center" | "left" | "right" | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        apply_color_to?: "background" | "value" | "badge" | undefined;
    } & {
        field: string;
        operation: "unique_count";
        empty_as_null: boolean;
    }> | Readonly<{
        color?: Readonly<{} & {
            type: "legacy_dynamic";
            palette: string;
            shift: boolean;
            range: "absolute" | "percentage";
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
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mapping: Readonly<{} & {
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[] | undefined;
            sort?: "desc" | "asc" | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            palette: string;
            mode: "gradient";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
        }> | undefined;
        label?: string | undefined;
        summary?: Readonly<{
            label?: string | undefined;
        } & {
            type: "min" | "max" | "count" | "sum" | "avg";
        }> | undefined;
        width?: number | undefined;
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
        visible?: boolean | undefined;
        alignment?: "center" | "left" | "right" | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        apply_color_to?: "background" | "value" | "badge" | undefined;
    } & {
        field: string;
        operation: "min" | "max" | "average" | "median" | "standard_deviation";
    }> | Readonly<{
        color?: Readonly<{} & {
            type: "legacy_dynamic";
            palette: string;
            shift: boolean;
            range: "absolute" | "percentage";
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
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mapping: Readonly<{} & {
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[] | undefined;
            sort?: "desc" | "asc" | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            palette: string;
            mode: "gradient";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
        }> | undefined;
        label?: string | undefined;
        summary?: Readonly<{
            label?: string | undefined;
        } & {
            type: "min" | "max" | "count" | "sum" | "avg";
        }> | undefined;
        width?: number | undefined;
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
        visible?: boolean | undefined;
        alignment?: "center" | "left" | "right" | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        apply_color_to?: "background" | "value" | "badge" | undefined;
    } & {
        field: string;
        operation: "sum";
        empty_as_null: boolean;
    }> | Readonly<{
        color?: Readonly<{} & {
            type: "legacy_dynamic";
            palette: string;
            shift: boolean;
            range: "absolute" | "percentage";
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
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mapping: Readonly<{} & {
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[] | undefined;
            sort?: "desc" | "asc" | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            palette: string;
            mode: "gradient";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
        }> | undefined;
        label?: string | undefined;
        summary?: Readonly<{
            label?: string | undefined;
        } & {
            type: "min" | "max" | "count" | "sum" | "avg";
        }> | undefined;
        width?: number | undefined;
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
        visible?: boolean | undefined;
        alignment?: "center" | "left" | "right" | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        apply_color_to?: "background" | "value" | "badge" | undefined;
    } & {
        field: string;
        operation: "last_value";
        time_field: string;
        multi_value: boolean;
    }> | Readonly<{
        color?: Readonly<{} & {
            type: "legacy_dynamic";
            palette: string;
            shift: boolean;
            range: "absolute" | "percentage";
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
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mapping: Readonly<{} & {
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[] | undefined;
            sort?: "desc" | "asc" | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            palette: string;
            mode: "gradient";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
        }> | undefined;
        label?: string | undefined;
        summary?: Readonly<{
            label?: string | undefined;
        } & {
            type: "min" | "max" | "count" | "sum" | "avg";
        }> | undefined;
        width?: number | undefined;
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
        visible?: boolean | undefined;
        alignment?: "center" | "left" | "right" | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        apply_color_to?: "background" | "value" | "badge" | undefined;
    } & {
        field: string;
        percentile: number;
        operation: "percentile";
    }> | Readonly<{
        color?: Readonly<{} & {
            type: "legacy_dynamic";
            palette: string;
            shift: boolean;
            range: "absolute" | "percentage";
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
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mapping: Readonly<{} & {
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[] | undefined;
            sort?: "desc" | "asc" | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            palette: string;
            mode: "gradient";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
        }> | undefined;
        label?: string | undefined;
        summary?: Readonly<{
            label?: string | undefined;
        } & {
            type: "min" | "max" | "count" | "sum" | "avg";
        }> | undefined;
        width?: number | undefined;
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
        visible?: boolean | undefined;
        alignment?: "center" | "left" | "right" | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        apply_color_to?: "background" | "value" | "badge" | undefined;
    } & {
        field: string;
        rank: number;
        operation: "percentile_rank";
    }> | Readonly<{
        color?: Readonly<{} & {
            type: "legacy_dynamic";
            palette: string;
            shift: boolean;
            range: "absolute" | "percentage";
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
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mapping: Readonly<{} & {
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[] | undefined;
            sort?: "desc" | "asc" | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            palette: string;
            mode: "gradient";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
        }> | undefined;
        label?: string | undefined;
        summary?: Readonly<{
            label?: string | undefined;
        } & {
            type: "min" | "max" | "count" | "sum" | "avg";
        }> | undefined;
        width?: number | undefined;
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
        visible?: boolean | undefined;
        alignment?: "center" | "left" | "right" | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        apply_color_to?: "background" | "value" | "badge" | undefined;
    } & {
        operation: "differences";
        of: Readonly<{
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            operation: "count";
            empty_as_null: boolean;
        }> | Readonly<{
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            field: string;
            operation: "unique_count";
            empty_as_null: boolean;
        }> | Readonly<{
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            field: string;
            operation: "min" | "max" | "average" | "median" | "standard_deviation";
        }> | Readonly<{
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            field: string;
            operation: "sum";
            empty_as_null: boolean;
        }> | Readonly<{
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
            time_scale?: "s" | "h" | "d" | "m" | undefined;
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
                language: "kql" | "lucene";
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
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            field: string;
            percentile: number;
            operation: "percentile";
        }> | Readonly<{
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            field: string;
            rank: number;
            operation: "percentile_rank";
        }>;
    }> | Readonly<{
        color?: Readonly<{} & {
            type: "legacy_dynamic";
            palette: string;
            shift: boolean;
            range: "absolute" | "percentage";
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
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mapping: Readonly<{} & {
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[] | undefined;
            sort?: "desc" | "asc" | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            palette: string;
            mode: "gradient";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
        }> | undefined;
        label?: string | undefined;
        summary?: Readonly<{
            label?: string | undefined;
        } & {
            type: "min" | "max" | "count" | "sum" | "avg";
        }> | undefined;
        width?: number | undefined;
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
        visible?: boolean | undefined;
        alignment?: "center" | "left" | "right" | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        apply_color_to?: "background" | "value" | "badge" | undefined;
    } & {
        window: number;
        operation: "moving_average";
        of: Readonly<{
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            operation: "count";
            empty_as_null: boolean;
        }> | Readonly<{
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            field: string;
            operation: "unique_count";
            empty_as_null: boolean;
        }> | Readonly<{
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            field: string;
            operation: "min" | "max" | "average" | "median" | "standard_deviation";
        }> | Readonly<{
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            field: string;
            operation: "sum";
            empty_as_null: boolean;
        }> | Readonly<{
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
            time_scale?: "s" | "h" | "d" | "m" | undefined;
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
                language: "kql" | "lucene";
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
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            field: string;
            percentile: number;
            operation: "percentile";
        }> | Readonly<{
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            field: string;
            rank: number;
            operation: "percentile_rank";
        }>;
    }> | Readonly<{
        color?: Readonly<{} & {
            type: "legacy_dynamic";
            palette: string;
            shift: boolean;
            range: "absolute" | "percentage";
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
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mapping: Readonly<{} & {
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[] | undefined;
            sort?: "desc" | "asc" | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            palette: string;
            mode: "gradient";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
        }> | undefined;
        label?: string | undefined;
        summary?: Readonly<{
            label?: string | undefined;
        } & {
            type: "min" | "max" | "count" | "sum" | "avg";
        }> | undefined;
        width?: number | undefined;
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
        visible?: boolean | undefined;
        alignment?: "center" | "left" | "right" | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        apply_color_to?: "background" | "value" | "badge" | undefined;
    } & {
        field: string;
        operation: "cumulative_sum";
    }> | Readonly<{
        color?: Readonly<{} & {
            type: "legacy_dynamic";
            palette: string;
            shift: boolean;
            range: "absolute" | "percentage";
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
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mapping: Readonly<{} & {
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[] | undefined;
            sort?: "desc" | "asc" | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            palette: string;
            mode: "gradient";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
        }> | undefined;
        label?: string | undefined;
        summary?: Readonly<{
            label?: string | undefined;
        } & {
            type: "min" | "max" | "count" | "sum" | "avg";
        }> | undefined;
        width?: number | undefined;
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
        visible?: boolean | undefined;
        alignment?: "center" | "left" | "right" | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        apply_color_to?: "background" | "value" | "badge" | undefined;
    } & {
        field: string;
        operation: "counter_rate";
    }> | Readonly<{
        color?: Readonly<{} & {
            type: "legacy_dynamic";
            palette: string;
            shift: boolean;
            range: "absolute" | "percentage";
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
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mapping: Readonly<{} & {
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[] | undefined;
            sort?: "desc" | "asc" | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            palette: string;
            mode: "gradient";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
        }> | undefined;
        label?: string | undefined;
        summary?: Readonly<{
            label?: string | undefined;
        } & {
            type: "min" | "max" | "count" | "sum" | "avg";
        }> | undefined;
        width?: number | undefined;
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
        visible?: boolean | undefined;
        alignment?: "center" | "left" | "right" | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        apply_color_to?: "background" | "value" | "badge" | undefined;
    } & {
        formula: string;
        operation: "formula";
    }>)[]>;
    /**
     * Row configuration, optional bucket operations.
     */
    rows: import("@kbn/config-schema").Type<(Readonly<{
        color?: Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mapping: Readonly<{} & {
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[] | undefined;
            sort?: "desc" | "asc" | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            palette: string;
            mode: "gradient";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        width?: number | undefined;
        visible?: boolean | undefined;
        alignment?: "center" | "left" | "right" | undefined;
        drop_partial_intervals?: boolean | undefined;
        apply_color_to?: "background" | "value" | "badge" | undefined;
        collapse_by?: "min" | "max" | "sum" | "avg" | undefined;
        click_filter?: boolean | undefined;
    } & {
        field: string;
        operation: "date_histogram";
        suggested_interval: string;
        use_original_time_range: boolean;
        include_empty_rows: boolean;
    }> | Readonly<{
        color?: Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mapping: Readonly<{} & {
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[] | undefined;
            sort?: "desc" | "asc" | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            palette: string;
            mode: "gradient";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        includes?: Readonly<{
            as_regex?: boolean | undefined;
        } & {
            values: string[];
        }> | undefined;
        label?: string | undefined;
        width?: number | undefined;
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
        visible?: boolean | undefined;
        alignment?: "center" | "left" | "right" | undefined;
        excludes?: Readonly<{
            as_regex?: boolean | undefined;
        } & {
            values: string[];
        }> | undefined;
        increase_accuracy?: boolean | undefined;
        other_bucket?: Readonly<{} & {
            include_documents_without_field: boolean;
        }> | undefined;
        rank_by?: Readonly<{} & {
            type: "alphabetical";
            direction: "desc" | "asc";
        }> | Readonly<{} & {
            type: "rare";
            max: number;
        }> | Readonly<{} & {
            type: "significant";
        }> | Readonly<{} & {
            type: "metric";
            direction: "desc" | "asc";
            metric_index: number;
        }> | Readonly<{} & {
            type: "custom";
            field: string;
            direction: "desc" | "asc";
            operation: "min" | "max" | "sum" | "average" | "median" | "last_value" | "unique_count" | "standard_deviation";
        }> | Readonly<{
            field?: string | undefined;
        } & {
            type: "custom";
            direction: "desc" | "asc";
            operation: "count";
        }> | Readonly<{} & {
            type: "custom";
            field: string;
            direction: "desc" | "asc";
            percentile: number;
            operation: "percentile";
        }> | Readonly<{} & {
            type: "custom";
            field: string;
            direction: "desc" | "asc";
            rank: number;
            operation: "percentile_rank";
        }> | undefined;
        apply_color_to?: "background" | "value" | "badge" | undefined;
        collapse_by?: "min" | "max" | "sum" | "avg" | undefined;
        click_filter?: boolean | undefined;
    } & {
        fields: string[];
        limit: number;
        operation: "terms";
    }> | Readonly<{
        color?: Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mapping: Readonly<{} & {
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[] | undefined;
            sort?: "desc" | "asc" | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            palette: string;
            mode: "gradient";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        width?: number | undefined;
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
        visible?: boolean | undefined;
        alignment?: "center" | "left" | "right" | undefined;
        apply_color_to?: "background" | "value" | "badge" | undefined;
        collapse_by?: "min" | "max" | "sum" | "avg" | undefined;
        click_filter?: boolean | undefined;
    } & {
        field: string;
        operation: "histogram";
        include_empty_rows: boolean;
        granularity: number | "auto";
    }> | Readonly<{
        color?: Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mapping: Readonly<{} & {
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[] | undefined;
            sort?: "desc" | "asc" | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            palette: string;
            mode: "gradient";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        width?: number | undefined;
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
        visible?: boolean | undefined;
        alignment?: "center" | "left" | "right" | undefined;
        apply_color_to?: "background" | "value" | "badge" | undefined;
        collapse_by?: "min" | "max" | "sum" | "avg" | undefined;
        click_filter?: boolean | undefined;
    } & {
        field: string;
        ranges: Readonly<{
            label?: string | undefined;
            lte?: number | undefined;
            gt?: number | undefined;
        } & {}>[];
        operation: "range";
    }> | Readonly<{
        color?: Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mapping: Readonly<{} & {
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[] | undefined;
            sort?: "desc" | "asc" | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            palette: string;
            mode: "gradient";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        width?: number | undefined;
        visible?: boolean | undefined;
        alignment?: "center" | "left" | "right" | undefined;
        apply_color_to?: "background" | "value" | "badge" | undefined;
        collapse_by?: "min" | "max" | "sum" | "avg" | undefined;
        click_filter?: boolean | undefined;
    } & {
        filters: Readonly<{
            label?: string | undefined;
        } & {
            filter: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
            }>;
        }>[];
        operation: "filters";
    }>)[] | undefined>;
    /**
     * Split metrics by configuration, optional bucket operations.
     */
    split_metrics_by: import("@kbn/config-schema").Type<(Readonly<{
        label?: string | undefined;
        drop_partial_intervals?: boolean | undefined;
    } & {
        field: string;
        operation: "date_histogram";
        suggested_interval: string;
        use_original_time_range: boolean;
        include_empty_rows: boolean;
    }> | Readonly<{
        includes?: Readonly<{
            as_regex?: boolean | undefined;
        } & {
            values: string[];
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
        excludes?: Readonly<{
            as_regex?: boolean | undefined;
        } & {
            values: string[];
        }> | undefined;
        increase_accuracy?: boolean | undefined;
        other_bucket?: Readonly<{} & {
            include_documents_without_field: boolean;
        }> | undefined;
        rank_by?: Readonly<{} & {
            type: "alphabetical";
            direction: "desc" | "asc";
        }> | Readonly<{} & {
            type: "rare";
            max: number;
        }> | Readonly<{} & {
            type: "significant";
        }> | Readonly<{} & {
            type: "metric";
            direction: "desc" | "asc";
            metric_index: number;
        }> | Readonly<{} & {
            type: "custom";
            field: string;
            direction: "desc" | "asc";
            operation: "min" | "max" | "sum" | "average" | "median" | "last_value" | "unique_count" | "standard_deviation";
        }> | Readonly<{
            field?: string | undefined;
        } & {
            type: "custom";
            direction: "desc" | "asc";
            operation: "count";
        }> | Readonly<{} & {
            type: "custom";
            field: string;
            direction: "desc" | "asc";
            percentile: number;
            operation: "percentile";
        }> | Readonly<{} & {
            type: "custom";
            field: string;
            direction: "desc" | "asc";
            rank: number;
            operation: "percentile_rank";
        }> | undefined;
    } & {
        fields: string[];
        limit: number;
        operation: "terms";
    }> | Readonly<{
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
    } & {
        field: string;
        operation: "histogram";
        include_empty_rows: boolean;
        granularity: number | "auto";
    }> | Readonly<{
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
    } & {
        field: string;
        ranges: Readonly<{
            label?: string | undefined;
            lte?: number | undefined;
            gt?: number | undefined;
        } & {}>[];
        operation: "range";
    }> | Readonly<{
        label?: string | undefined;
    } & {
        filters: Readonly<{
            label?: string | undefined;
        } & {
            filter: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
            }>;
        }>[];
        operation: "filters";
    }>)[] | undefined>;
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
    type: import("@kbn/config-schema").Type<"data_table">;
}>;
export declare const datatableConfigSchemaESQL: import("@kbn/config-schema").ObjectType<{
    styling: import("@kbn/config-schema").Type<Readonly<{
        sort_by?: Readonly<{} & {
            index: number;
            direction: "desc" | "asc";
            column_type: "metric" | "row";
        }> | Readonly<{} & {
            index: number;
            values: string[];
            direction: "desc" | "asc";
            column_type: "pivoted_metric";
        }> | undefined;
        density?: Readonly<{
            mode?: "default" | "compact" | "expanded" | undefined;
            height?: Readonly<{
                header?: Readonly<{} & {
                    type: "auto";
                }> | Readonly<{} & {
                    type: "custom";
                    max_lines: number;
                }> | undefined;
                value?: Readonly<{} & {
                    type: "auto";
                }> | Readonly<{} & {
                    type: "custom";
                    lines: number;
                }> | undefined;
            } & {}> | undefined;
        } & {}> | undefined;
        paging?: 100 | 10 | 20 | 50 | 30 | undefined;
        row_numbers?: Readonly<{} & {
            visible: boolean;
        }> | undefined;
    } & {}> | undefined>;
    /**
     * Metric columns configuration, must define operation.
     */
    metrics: import("@kbn/config-schema").Type<Readonly<{
        color?: Readonly<{} & {
            type: "legacy_dynamic";
            palette: string;
            shift: boolean;
            range: "absolute" | "percentage";
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
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mapping: Readonly<{} & {
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[] | undefined;
            sort?: "desc" | "asc" | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            palette: string;
            mode: "gradient";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        summary?: Readonly<{
            label?: string | undefined;
        } & {
            type: "min" | "max" | "count" | "sum" | "avg";
        }> | undefined;
        width?: number | undefined;
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
        visible?: boolean | undefined;
        alignment?: "center" | "left" | "right" | undefined;
        apply_color_to?: "background" | "value" | "badge" | undefined;
    } & {
        column: string;
    }>[] | undefined>;
    /**
     * Row configuration, optional operations.
     */
    rows: import("@kbn/config-schema").Type<Readonly<{
        color?: Readonly<{} & {
            type: "legacy_dynamic";
            palette: string;
            shift: boolean;
            range: "absolute" | "percentage";
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
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mapping: Readonly<{} & {
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[] | undefined;
            sort?: "desc" | "asc" | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            palette: string;
            mode: "gradient";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        width?: number | undefined;
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
        visible?: boolean | undefined;
        alignment?: "center" | "left" | "right" | undefined;
        apply_color_to?: "background" | "value" | "badge" | undefined;
        collapse_by?: "min" | "max" | "sum" | "avg" | undefined;
        click_filter?: boolean | undefined;
    } & {
        column: string;
    }>[] | undefined>;
    /**
     * Split metrics by configuration, optional operations.
     */
    split_metrics_by: import("@kbn/config-schema").Type<Readonly<{
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
    } & {
        column: string;
    }>[] | undefined>;
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
    type: import("@kbn/config-schema").Type<"data_table">;
}>;
export declare const datatableConfigSchema: import("./utils/object_union").ObjectUnionType<[import("@kbn/config-schema").ObjectType<{
    styling: import("@kbn/config-schema").Type<Readonly<{
        sort_by?: Readonly<{} & {
            index: number;
            direction: "desc" | "asc";
            column_type: "metric" | "row";
        }> | Readonly<{} & {
            index: number;
            values: string[];
            direction: "desc" | "asc";
            column_type: "pivoted_metric";
        }> | undefined;
        density?: Readonly<{
            mode?: "default" | "compact" | "expanded" | undefined;
            height?: Readonly<{
                header?: Readonly<{} & {
                    type: "auto";
                }> | Readonly<{} & {
                    type: "custom";
                    max_lines: number;
                }> | undefined;
                value?: Readonly<{} & {
                    type: "auto";
                }> | Readonly<{} & {
                    type: "custom";
                    lines: number;
                }> | undefined;
            } & {}> | undefined;
        } & {}> | undefined;
        paging?: 100 | 10 | 20 | 50 | 30 | undefined;
        row_numbers?: Readonly<{} & {
            visible: boolean;
        }> | undefined;
    } & {}> | undefined>;
    /**
     * Metric columns configuration, must define operation.
     */
    metrics: import("@kbn/config-schema").Type<(Readonly<{
        color?: Readonly<{} & {
            type: "legacy_dynamic";
            palette: string;
            shift: boolean;
            range: "absolute" | "percentage";
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
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mapping: Readonly<{} & {
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[] | undefined;
            sort?: "desc" | "asc" | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            palette: string;
            mode: "gradient";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
        }> | undefined;
        label?: string | undefined;
        summary?: Readonly<{
            label?: string | undefined;
        } & {
            type: "min" | "max" | "count" | "sum" | "avg";
        }> | undefined;
        field?: string | undefined;
        width?: number | undefined;
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
        visible?: boolean | undefined;
        alignment?: "center" | "left" | "right" | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        apply_color_to?: "background" | "value" | "badge" | undefined;
    } & {
        operation: "count";
        empty_as_null: boolean;
    }> | Readonly<{
        color?: Readonly<{} & {
            type: "legacy_dynamic";
            palette: string;
            shift: boolean;
            range: "absolute" | "percentage";
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
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mapping: Readonly<{} & {
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[] | undefined;
            sort?: "desc" | "asc" | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            palette: string;
            mode: "gradient";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
        }> | undefined;
        label?: string | undefined;
        summary?: Readonly<{
            label?: string | undefined;
        } & {
            type: "min" | "max" | "count" | "sum" | "avg";
        }> | undefined;
        width?: number | undefined;
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
        visible?: boolean | undefined;
        alignment?: "center" | "left" | "right" | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        apply_color_to?: "background" | "value" | "badge" | undefined;
    } & {
        field: string;
        operation: "unique_count";
        empty_as_null: boolean;
    }> | Readonly<{
        color?: Readonly<{} & {
            type: "legacy_dynamic";
            palette: string;
            shift: boolean;
            range: "absolute" | "percentage";
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
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mapping: Readonly<{} & {
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[] | undefined;
            sort?: "desc" | "asc" | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            palette: string;
            mode: "gradient";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
        }> | undefined;
        label?: string | undefined;
        summary?: Readonly<{
            label?: string | undefined;
        } & {
            type: "min" | "max" | "count" | "sum" | "avg";
        }> | undefined;
        width?: number | undefined;
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
        visible?: boolean | undefined;
        alignment?: "center" | "left" | "right" | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        apply_color_to?: "background" | "value" | "badge" | undefined;
    } & {
        field: string;
        operation: "min" | "max" | "average" | "median" | "standard_deviation";
    }> | Readonly<{
        color?: Readonly<{} & {
            type: "legacy_dynamic";
            palette: string;
            shift: boolean;
            range: "absolute" | "percentage";
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
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mapping: Readonly<{} & {
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[] | undefined;
            sort?: "desc" | "asc" | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            palette: string;
            mode: "gradient";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
        }> | undefined;
        label?: string | undefined;
        summary?: Readonly<{
            label?: string | undefined;
        } & {
            type: "min" | "max" | "count" | "sum" | "avg";
        }> | undefined;
        width?: number | undefined;
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
        visible?: boolean | undefined;
        alignment?: "center" | "left" | "right" | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        apply_color_to?: "background" | "value" | "badge" | undefined;
    } & {
        field: string;
        operation: "sum";
        empty_as_null: boolean;
    }> | Readonly<{
        color?: Readonly<{} & {
            type: "legacy_dynamic";
            palette: string;
            shift: boolean;
            range: "absolute" | "percentage";
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
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mapping: Readonly<{} & {
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[] | undefined;
            sort?: "desc" | "asc" | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            palette: string;
            mode: "gradient";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
        }> | undefined;
        label?: string | undefined;
        summary?: Readonly<{
            label?: string | undefined;
        } & {
            type: "min" | "max" | "count" | "sum" | "avg";
        }> | undefined;
        width?: number | undefined;
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
        visible?: boolean | undefined;
        alignment?: "center" | "left" | "right" | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        apply_color_to?: "background" | "value" | "badge" | undefined;
    } & {
        field: string;
        operation: "last_value";
        time_field: string;
        multi_value: boolean;
    }> | Readonly<{
        color?: Readonly<{} & {
            type: "legacy_dynamic";
            palette: string;
            shift: boolean;
            range: "absolute" | "percentage";
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
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mapping: Readonly<{} & {
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[] | undefined;
            sort?: "desc" | "asc" | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            palette: string;
            mode: "gradient";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
        }> | undefined;
        label?: string | undefined;
        summary?: Readonly<{
            label?: string | undefined;
        } & {
            type: "min" | "max" | "count" | "sum" | "avg";
        }> | undefined;
        width?: number | undefined;
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
        visible?: boolean | undefined;
        alignment?: "center" | "left" | "right" | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        apply_color_to?: "background" | "value" | "badge" | undefined;
    } & {
        field: string;
        percentile: number;
        operation: "percentile";
    }> | Readonly<{
        color?: Readonly<{} & {
            type: "legacy_dynamic";
            palette: string;
            shift: boolean;
            range: "absolute" | "percentage";
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
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mapping: Readonly<{} & {
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[] | undefined;
            sort?: "desc" | "asc" | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            palette: string;
            mode: "gradient";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
        }> | undefined;
        label?: string | undefined;
        summary?: Readonly<{
            label?: string | undefined;
        } & {
            type: "min" | "max" | "count" | "sum" | "avg";
        }> | undefined;
        width?: number | undefined;
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
        visible?: boolean | undefined;
        alignment?: "center" | "left" | "right" | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        apply_color_to?: "background" | "value" | "badge" | undefined;
    } & {
        field: string;
        rank: number;
        operation: "percentile_rank";
    }> | Readonly<{
        color?: Readonly<{} & {
            type: "legacy_dynamic";
            palette: string;
            shift: boolean;
            range: "absolute" | "percentage";
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
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mapping: Readonly<{} & {
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[] | undefined;
            sort?: "desc" | "asc" | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            palette: string;
            mode: "gradient";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
        }> | undefined;
        label?: string | undefined;
        summary?: Readonly<{
            label?: string | undefined;
        } & {
            type: "min" | "max" | "count" | "sum" | "avg";
        }> | undefined;
        width?: number | undefined;
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
        visible?: boolean | undefined;
        alignment?: "center" | "left" | "right" | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        apply_color_to?: "background" | "value" | "badge" | undefined;
    } & {
        operation: "differences";
        of: Readonly<{
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            operation: "count";
            empty_as_null: boolean;
        }> | Readonly<{
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            field: string;
            operation: "unique_count";
            empty_as_null: boolean;
        }> | Readonly<{
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            field: string;
            operation: "min" | "max" | "average" | "median" | "standard_deviation";
        }> | Readonly<{
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            field: string;
            operation: "sum";
            empty_as_null: boolean;
        }> | Readonly<{
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
            time_scale?: "s" | "h" | "d" | "m" | undefined;
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
                language: "kql" | "lucene";
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
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            field: string;
            percentile: number;
            operation: "percentile";
        }> | Readonly<{
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            field: string;
            rank: number;
            operation: "percentile_rank";
        }>;
    }> | Readonly<{
        color?: Readonly<{} & {
            type: "legacy_dynamic";
            palette: string;
            shift: boolean;
            range: "absolute" | "percentage";
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
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mapping: Readonly<{} & {
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[] | undefined;
            sort?: "desc" | "asc" | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            palette: string;
            mode: "gradient";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
        }> | undefined;
        label?: string | undefined;
        summary?: Readonly<{
            label?: string | undefined;
        } & {
            type: "min" | "max" | "count" | "sum" | "avg";
        }> | undefined;
        width?: number | undefined;
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
        visible?: boolean | undefined;
        alignment?: "center" | "left" | "right" | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        apply_color_to?: "background" | "value" | "badge" | undefined;
    } & {
        window: number;
        operation: "moving_average";
        of: Readonly<{
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            operation: "count";
            empty_as_null: boolean;
        }> | Readonly<{
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            field: string;
            operation: "unique_count";
            empty_as_null: boolean;
        }> | Readonly<{
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            field: string;
            operation: "min" | "max" | "average" | "median" | "standard_deviation";
        }> | Readonly<{
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            field: string;
            operation: "sum";
            empty_as_null: boolean;
        }> | Readonly<{
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
            time_scale?: "s" | "h" | "d" | "m" | undefined;
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
                language: "kql" | "lucene";
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
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            field: string;
            percentile: number;
            operation: "percentile";
        }> | Readonly<{
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            field: string;
            rank: number;
            operation: "percentile_rank";
        }>;
    }> | Readonly<{
        color?: Readonly<{} & {
            type: "legacy_dynamic";
            palette: string;
            shift: boolean;
            range: "absolute" | "percentage";
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
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mapping: Readonly<{} & {
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[] | undefined;
            sort?: "desc" | "asc" | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            palette: string;
            mode: "gradient";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
        }> | undefined;
        label?: string | undefined;
        summary?: Readonly<{
            label?: string | undefined;
        } & {
            type: "min" | "max" | "count" | "sum" | "avg";
        }> | undefined;
        width?: number | undefined;
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
        visible?: boolean | undefined;
        alignment?: "center" | "left" | "right" | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        apply_color_to?: "background" | "value" | "badge" | undefined;
    } & {
        field: string;
        operation: "cumulative_sum";
    }> | Readonly<{
        color?: Readonly<{} & {
            type: "legacy_dynamic";
            palette: string;
            shift: boolean;
            range: "absolute" | "percentage";
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
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mapping: Readonly<{} & {
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[] | undefined;
            sort?: "desc" | "asc" | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            palette: string;
            mode: "gradient";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
        }> | undefined;
        label?: string | undefined;
        summary?: Readonly<{
            label?: string | undefined;
        } & {
            type: "min" | "max" | "count" | "sum" | "avg";
        }> | undefined;
        width?: number | undefined;
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
        visible?: boolean | undefined;
        alignment?: "center" | "left" | "right" | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        apply_color_to?: "background" | "value" | "badge" | undefined;
    } & {
        field: string;
        operation: "counter_rate";
    }> | Readonly<{
        color?: Readonly<{} & {
            type: "legacy_dynamic";
            palette: string;
            shift: boolean;
            range: "absolute" | "percentage";
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
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mapping: Readonly<{} & {
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[] | undefined;
            sort?: "desc" | "asc" | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            palette: string;
            mode: "gradient";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
        }> | undefined;
        label?: string | undefined;
        summary?: Readonly<{
            label?: string | undefined;
        } & {
            type: "min" | "max" | "count" | "sum" | "avg";
        }> | undefined;
        width?: number | undefined;
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
        visible?: boolean | undefined;
        alignment?: "center" | "left" | "right" | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        apply_color_to?: "background" | "value" | "badge" | undefined;
    } & {
        formula: string;
        operation: "formula";
    }>)[]>;
    /**
     * Row configuration, optional bucket operations.
     */
    rows: import("@kbn/config-schema").Type<(Readonly<{
        color?: Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mapping: Readonly<{} & {
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[] | undefined;
            sort?: "desc" | "asc" | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            palette: string;
            mode: "gradient";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        width?: number | undefined;
        visible?: boolean | undefined;
        alignment?: "center" | "left" | "right" | undefined;
        drop_partial_intervals?: boolean | undefined;
        apply_color_to?: "background" | "value" | "badge" | undefined;
        collapse_by?: "min" | "max" | "sum" | "avg" | undefined;
        click_filter?: boolean | undefined;
    } & {
        field: string;
        operation: "date_histogram";
        suggested_interval: string;
        use_original_time_range: boolean;
        include_empty_rows: boolean;
    }> | Readonly<{
        color?: Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mapping: Readonly<{} & {
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[] | undefined;
            sort?: "desc" | "asc" | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            palette: string;
            mode: "gradient";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        includes?: Readonly<{
            as_regex?: boolean | undefined;
        } & {
            values: string[];
        }> | undefined;
        label?: string | undefined;
        width?: number | undefined;
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
        visible?: boolean | undefined;
        alignment?: "center" | "left" | "right" | undefined;
        excludes?: Readonly<{
            as_regex?: boolean | undefined;
        } & {
            values: string[];
        }> | undefined;
        increase_accuracy?: boolean | undefined;
        other_bucket?: Readonly<{} & {
            include_documents_without_field: boolean;
        }> | undefined;
        rank_by?: Readonly<{} & {
            type: "alphabetical";
            direction: "desc" | "asc";
        }> | Readonly<{} & {
            type: "rare";
            max: number;
        }> | Readonly<{} & {
            type: "significant";
        }> | Readonly<{} & {
            type: "metric";
            direction: "desc" | "asc";
            metric_index: number;
        }> | Readonly<{} & {
            type: "custom";
            field: string;
            direction: "desc" | "asc";
            operation: "min" | "max" | "sum" | "average" | "median" | "last_value" | "unique_count" | "standard_deviation";
        }> | Readonly<{
            field?: string | undefined;
        } & {
            type: "custom";
            direction: "desc" | "asc";
            operation: "count";
        }> | Readonly<{} & {
            type: "custom";
            field: string;
            direction: "desc" | "asc";
            percentile: number;
            operation: "percentile";
        }> | Readonly<{} & {
            type: "custom";
            field: string;
            direction: "desc" | "asc";
            rank: number;
            operation: "percentile_rank";
        }> | undefined;
        apply_color_to?: "background" | "value" | "badge" | undefined;
        collapse_by?: "min" | "max" | "sum" | "avg" | undefined;
        click_filter?: boolean | undefined;
    } & {
        fields: string[];
        limit: number;
        operation: "terms";
    }> | Readonly<{
        color?: Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mapping: Readonly<{} & {
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[] | undefined;
            sort?: "desc" | "asc" | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            palette: string;
            mode: "gradient";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        width?: number | undefined;
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
        visible?: boolean | undefined;
        alignment?: "center" | "left" | "right" | undefined;
        apply_color_to?: "background" | "value" | "badge" | undefined;
        collapse_by?: "min" | "max" | "sum" | "avg" | undefined;
        click_filter?: boolean | undefined;
    } & {
        field: string;
        operation: "histogram";
        include_empty_rows: boolean;
        granularity: number | "auto";
    }> | Readonly<{
        color?: Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mapping: Readonly<{} & {
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[] | undefined;
            sort?: "desc" | "asc" | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            palette: string;
            mode: "gradient";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        width?: number | undefined;
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
        visible?: boolean | undefined;
        alignment?: "center" | "left" | "right" | undefined;
        apply_color_to?: "background" | "value" | "badge" | undefined;
        collapse_by?: "min" | "max" | "sum" | "avg" | undefined;
        click_filter?: boolean | undefined;
    } & {
        field: string;
        ranges: Readonly<{
            label?: string | undefined;
            lte?: number | undefined;
            gt?: number | undefined;
        } & {}>[];
        operation: "range";
    }> | Readonly<{
        color?: Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mapping: Readonly<{} & {
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[] | undefined;
            sort?: "desc" | "asc" | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            palette: string;
            mode: "gradient";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        width?: number | undefined;
        visible?: boolean | undefined;
        alignment?: "center" | "left" | "right" | undefined;
        apply_color_to?: "background" | "value" | "badge" | undefined;
        collapse_by?: "min" | "max" | "sum" | "avg" | undefined;
        click_filter?: boolean | undefined;
    } & {
        filters: Readonly<{
            label?: string | undefined;
        } & {
            filter: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
            }>;
        }>[];
        operation: "filters";
    }>)[] | undefined>;
    /**
     * Split metrics by configuration, optional bucket operations.
     */
    split_metrics_by: import("@kbn/config-schema").Type<(Readonly<{
        label?: string | undefined;
        drop_partial_intervals?: boolean | undefined;
    } & {
        field: string;
        operation: "date_histogram";
        suggested_interval: string;
        use_original_time_range: boolean;
        include_empty_rows: boolean;
    }> | Readonly<{
        includes?: Readonly<{
            as_regex?: boolean | undefined;
        } & {
            values: string[];
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
        excludes?: Readonly<{
            as_regex?: boolean | undefined;
        } & {
            values: string[];
        }> | undefined;
        increase_accuracy?: boolean | undefined;
        other_bucket?: Readonly<{} & {
            include_documents_without_field: boolean;
        }> | undefined;
        rank_by?: Readonly<{} & {
            type: "alphabetical";
            direction: "desc" | "asc";
        }> | Readonly<{} & {
            type: "rare";
            max: number;
        }> | Readonly<{} & {
            type: "significant";
        }> | Readonly<{} & {
            type: "metric";
            direction: "desc" | "asc";
            metric_index: number;
        }> | Readonly<{} & {
            type: "custom";
            field: string;
            direction: "desc" | "asc";
            operation: "min" | "max" | "sum" | "average" | "median" | "last_value" | "unique_count" | "standard_deviation";
        }> | Readonly<{
            field?: string | undefined;
        } & {
            type: "custom";
            direction: "desc" | "asc";
            operation: "count";
        }> | Readonly<{} & {
            type: "custom";
            field: string;
            direction: "desc" | "asc";
            percentile: number;
            operation: "percentile";
        }> | Readonly<{} & {
            type: "custom";
            field: string;
            direction: "desc" | "asc";
            rank: number;
            operation: "percentile_rank";
        }> | undefined;
    } & {
        fields: string[];
        limit: number;
        operation: "terms";
    }> | Readonly<{
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
    } & {
        field: string;
        operation: "histogram";
        include_empty_rows: boolean;
        granularity: number | "auto";
    }> | Readonly<{
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
    } & {
        field: string;
        ranges: Readonly<{
            label?: string | undefined;
            lte?: number | undefined;
            gt?: number | undefined;
        } & {}>[];
        operation: "range";
    }> | Readonly<{
        label?: string | undefined;
    } & {
        filters: Readonly<{
            label?: string | undefined;
        } & {
            filter: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
            }>;
        }>[];
        operation: "filters";
    }>)[] | undefined>;
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
    type: import("@kbn/config-schema").Type<"data_table">;
}>, import("@kbn/config-schema").ObjectType<{
    styling: import("@kbn/config-schema").Type<Readonly<{
        sort_by?: Readonly<{} & {
            index: number;
            direction: "desc" | "asc";
            column_type: "metric" | "row";
        }> | Readonly<{} & {
            index: number;
            values: string[];
            direction: "desc" | "asc";
            column_type: "pivoted_metric";
        }> | undefined;
        density?: Readonly<{
            mode?: "default" | "compact" | "expanded" | undefined;
            height?: Readonly<{
                header?: Readonly<{} & {
                    type: "auto";
                }> | Readonly<{} & {
                    type: "custom";
                    max_lines: number;
                }> | undefined;
                value?: Readonly<{} & {
                    type: "auto";
                }> | Readonly<{} & {
                    type: "custom";
                    lines: number;
                }> | undefined;
            } & {}> | undefined;
        } & {}> | undefined;
        paging?: 100 | 10 | 20 | 50 | 30 | undefined;
        row_numbers?: Readonly<{} & {
            visible: boolean;
        }> | undefined;
    } & {}> | undefined>;
    /**
     * Metric columns configuration, must define operation.
     */
    metrics: import("@kbn/config-schema").Type<Readonly<{
        color?: Readonly<{} & {
            type: "legacy_dynamic";
            palette: string;
            shift: boolean;
            range: "absolute" | "percentage";
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
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mapping: Readonly<{} & {
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[] | undefined;
            sort?: "desc" | "asc" | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            palette: string;
            mode: "gradient";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        summary?: Readonly<{
            label?: string | undefined;
        } & {
            type: "min" | "max" | "count" | "sum" | "avg";
        }> | undefined;
        width?: number | undefined;
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
        visible?: boolean | undefined;
        alignment?: "center" | "left" | "right" | undefined;
        apply_color_to?: "background" | "value" | "badge" | undefined;
    } & {
        column: string;
    }>[] | undefined>;
    /**
     * Row configuration, optional operations.
     */
    rows: import("@kbn/config-schema").Type<Readonly<{
        color?: Readonly<{} & {
            type: "legacy_dynamic";
            palette: string;
            shift: boolean;
            range: "absolute" | "percentage";
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
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mapping: Readonly<{} & {
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[] | undefined;
            sort?: "desc" | "asc" | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            palette: string;
            mode: "gradient";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        width?: number | undefined;
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
        visible?: boolean | undefined;
        alignment?: "center" | "left" | "right" | undefined;
        apply_color_to?: "background" | "value" | "badge" | undefined;
        collapse_by?: "min" | "max" | "sum" | "avg" | undefined;
        click_filter?: boolean | undefined;
    } & {
        column: string;
    }>[] | undefined>;
    /**
     * Split metrics by configuration, optional operations.
     */
    split_metrics_by: import("@kbn/config-schema").Type<Readonly<{
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
    } & {
        column: string;
    }>[] | undefined>;
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
    type: import("@kbn/config-schema").Type<"data_table">;
}>], Readonly<{
    query?: Readonly<{} & {
        expression: string;
        language: "kql" | "lucene";
    }> | undefined;
    title?: string | undefined;
    description?: string | undefined;
    rows?: (Readonly<{
        color?: Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mapping: Readonly<{} & {
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[] | undefined;
            sort?: "desc" | "asc" | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            palette: string;
            mode: "gradient";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        width?: number | undefined;
        visible?: boolean | undefined;
        alignment?: "center" | "left" | "right" | undefined;
        drop_partial_intervals?: boolean | undefined;
        apply_color_to?: "background" | "value" | "badge" | undefined;
        collapse_by?: "min" | "max" | "sum" | "avg" | undefined;
        click_filter?: boolean | undefined;
    } & {
        field: string;
        operation: "date_histogram";
        suggested_interval: string;
        use_original_time_range: boolean;
        include_empty_rows: boolean;
    }> | Readonly<{
        color?: Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mapping: Readonly<{} & {
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[] | undefined;
            sort?: "desc" | "asc" | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            palette: string;
            mode: "gradient";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        includes?: Readonly<{
            as_regex?: boolean | undefined;
        } & {
            values: string[];
        }> | undefined;
        label?: string | undefined;
        width?: number | undefined;
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
        visible?: boolean | undefined;
        alignment?: "center" | "left" | "right" | undefined;
        excludes?: Readonly<{
            as_regex?: boolean | undefined;
        } & {
            values: string[];
        }> | undefined;
        increase_accuracy?: boolean | undefined;
        other_bucket?: Readonly<{} & {
            include_documents_without_field: boolean;
        }> | undefined;
        rank_by?: Readonly<{} & {
            type: "alphabetical";
            direction: "desc" | "asc";
        }> | Readonly<{} & {
            type: "rare";
            max: number;
        }> | Readonly<{} & {
            type: "significant";
        }> | Readonly<{} & {
            type: "metric";
            direction: "desc" | "asc";
            metric_index: number;
        }> | Readonly<{} & {
            type: "custom";
            field: string;
            direction: "desc" | "asc";
            operation: "min" | "max" | "sum" | "average" | "median" | "last_value" | "unique_count" | "standard_deviation";
        }> | Readonly<{
            field?: string | undefined;
        } & {
            type: "custom";
            direction: "desc" | "asc";
            operation: "count";
        }> | Readonly<{} & {
            type: "custom";
            field: string;
            direction: "desc" | "asc";
            percentile: number;
            operation: "percentile";
        }> | Readonly<{} & {
            type: "custom";
            field: string;
            direction: "desc" | "asc";
            rank: number;
            operation: "percentile_rank";
        }> | undefined;
        apply_color_to?: "background" | "value" | "badge" | undefined;
        collapse_by?: "min" | "max" | "sum" | "avg" | undefined;
        click_filter?: boolean | undefined;
    } & {
        fields: string[];
        limit: number;
        operation: "terms";
    }> | Readonly<{
        color?: Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mapping: Readonly<{} & {
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[] | undefined;
            sort?: "desc" | "asc" | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            palette: string;
            mode: "gradient";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        width?: number | undefined;
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
        visible?: boolean | undefined;
        alignment?: "center" | "left" | "right" | undefined;
        apply_color_to?: "background" | "value" | "badge" | undefined;
        collapse_by?: "min" | "max" | "sum" | "avg" | undefined;
        click_filter?: boolean | undefined;
    } & {
        field: string;
        operation: "histogram";
        include_empty_rows: boolean;
        granularity: number | "auto";
    }> | Readonly<{
        color?: Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mapping: Readonly<{} & {
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[] | undefined;
            sort?: "desc" | "asc" | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            palette: string;
            mode: "gradient";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        width?: number | undefined;
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
        visible?: boolean | undefined;
        alignment?: "center" | "left" | "right" | undefined;
        apply_color_to?: "background" | "value" | "badge" | undefined;
        collapse_by?: "min" | "max" | "sum" | "avg" | undefined;
        click_filter?: boolean | undefined;
    } & {
        field: string;
        ranges: Readonly<{
            label?: string | undefined;
            lte?: number | undefined;
            gt?: number | undefined;
        } & {}>[];
        operation: "range";
    }> | Readonly<{
        color?: Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mapping: Readonly<{} & {
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[] | undefined;
            sort?: "desc" | "asc" | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            palette: string;
            mode: "gradient";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        width?: number | undefined;
        visible?: boolean | undefined;
        alignment?: "center" | "left" | "right" | undefined;
        apply_color_to?: "background" | "value" | "badge" | undefined;
        collapse_by?: "min" | "max" | "sum" | "avg" | undefined;
        click_filter?: boolean | undefined;
    } & {
        filters: Readonly<{
            label?: string | undefined;
        } & {
            filter: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
            }>;
        }>[];
        operation: "filters";
    }>)[] | undefined;
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
    styling?: Readonly<{
        sort_by?: Readonly<{} & {
            index: number;
            direction: "desc" | "asc";
            column_type: "metric" | "row";
        }> | Readonly<{} & {
            index: number;
            values: string[];
            direction: "desc" | "asc";
            column_type: "pivoted_metric";
        }> | undefined;
        density?: Readonly<{
            mode?: "default" | "compact" | "expanded" | undefined;
            height?: Readonly<{
                header?: Readonly<{} & {
                    type: "auto";
                }> | Readonly<{} & {
                    type: "custom";
                    max_lines: number;
                }> | undefined;
                value?: Readonly<{} & {
                    type: "auto";
                }> | Readonly<{} & {
                    type: "custom";
                    lines: number;
                }> | undefined;
            } & {}> | undefined;
        } & {}> | undefined;
        paging?: 100 | 10 | 20 | 50 | 30 | undefined;
        row_numbers?: Readonly<{} & {
            visible: boolean;
        }> | undefined;
    } & {}> | undefined;
    split_metrics_by?: (Readonly<{
        label?: string | undefined;
        drop_partial_intervals?: boolean | undefined;
    } & {
        field: string;
        operation: "date_histogram";
        suggested_interval: string;
        use_original_time_range: boolean;
        include_empty_rows: boolean;
    }> | Readonly<{
        includes?: Readonly<{
            as_regex?: boolean | undefined;
        } & {
            values: string[];
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
        excludes?: Readonly<{
            as_regex?: boolean | undefined;
        } & {
            values: string[];
        }> | undefined;
        increase_accuracy?: boolean | undefined;
        other_bucket?: Readonly<{} & {
            include_documents_without_field: boolean;
        }> | undefined;
        rank_by?: Readonly<{} & {
            type: "alphabetical";
            direction: "desc" | "asc";
        }> | Readonly<{} & {
            type: "rare";
            max: number;
        }> | Readonly<{} & {
            type: "significant";
        }> | Readonly<{} & {
            type: "metric";
            direction: "desc" | "asc";
            metric_index: number;
        }> | Readonly<{} & {
            type: "custom";
            field: string;
            direction: "desc" | "asc";
            operation: "min" | "max" | "sum" | "average" | "median" | "last_value" | "unique_count" | "standard_deviation";
        }> | Readonly<{
            field?: string | undefined;
        } & {
            type: "custom";
            direction: "desc" | "asc";
            operation: "count";
        }> | Readonly<{} & {
            type: "custom";
            field: string;
            direction: "desc" | "asc";
            percentile: number;
            operation: "percentile";
        }> | Readonly<{} & {
            type: "custom";
            field: string;
            direction: "desc" | "asc";
            rank: number;
            operation: "percentile_rank";
        }> | undefined;
    } & {
        fields: string[];
        limit: number;
        operation: "terms";
    }> | Readonly<{
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
    } & {
        field: string;
        operation: "histogram";
        include_empty_rows: boolean;
        granularity: number | "auto";
    }> | Readonly<{
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
    } & {
        field: string;
        ranges: Readonly<{
            label?: string | undefined;
            lte?: number | undefined;
            gt?: number | undefined;
        } & {}>[];
        operation: "range";
    }> | Readonly<{
        label?: string | undefined;
    } & {
        filters: Readonly<{
            label?: string | undefined;
        } & {
            filter: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
            }>;
        }>[];
        operation: "filters";
    }>)[] | undefined;
} & {
    type: "data_table";
    metrics: (Readonly<{
        color?: Readonly<{} & {
            type: "legacy_dynamic";
            palette: string;
            shift: boolean;
            range: "absolute" | "percentage";
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
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mapping: Readonly<{} & {
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[] | undefined;
            sort?: "desc" | "asc" | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            palette: string;
            mode: "gradient";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
        }> | undefined;
        label?: string | undefined;
        summary?: Readonly<{
            label?: string | undefined;
        } & {
            type: "min" | "max" | "count" | "sum" | "avg";
        }> | undefined;
        field?: string | undefined;
        width?: number | undefined;
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
        visible?: boolean | undefined;
        alignment?: "center" | "left" | "right" | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        apply_color_to?: "background" | "value" | "badge" | undefined;
    } & {
        operation: "count";
        empty_as_null: boolean;
    }> | Readonly<{
        color?: Readonly<{} & {
            type: "legacy_dynamic";
            palette: string;
            shift: boolean;
            range: "absolute" | "percentage";
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
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mapping: Readonly<{} & {
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[] | undefined;
            sort?: "desc" | "asc" | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            palette: string;
            mode: "gradient";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
        }> | undefined;
        label?: string | undefined;
        summary?: Readonly<{
            label?: string | undefined;
        } & {
            type: "min" | "max" | "count" | "sum" | "avg";
        }> | undefined;
        width?: number | undefined;
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
        visible?: boolean | undefined;
        alignment?: "center" | "left" | "right" | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        apply_color_to?: "background" | "value" | "badge" | undefined;
    } & {
        field: string;
        operation: "unique_count";
        empty_as_null: boolean;
    }> | Readonly<{
        color?: Readonly<{} & {
            type: "legacy_dynamic";
            palette: string;
            shift: boolean;
            range: "absolute" | "percentage";
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
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mapping: Readonly<{} & {
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[] | undefined;
            sort?: "desc" | "asc" | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            palette: string;
            mode: "gradient";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
        }> | undefined;
        label?: string | undefined;
        summary?: Readonly<{
            label?: string | undefined;
        } & {
            type: "min" | "max" | "count" | "sum" | "avg";
        }> | undefined;
        width?: number | undefined;
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
        visible?: boolean | undefined;
        alignment?: "center" | "left" | "right" | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        apply_color_to?: "background" | "value" | "badge" | undefined;
    } & {
        field: string;
        operation: "min" | "max" | "average" | "median" | "standard_deviation";
    }> | Readonly<{
        color?: Readonly<{} & {
            type: "legacy_dynamic";
            palette: string;
            shift: boolean;
            range: "absolute" | "percentage";
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
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mapping: Readonly<{} & {
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[] | undefined;
            sort?: "desc" | "asc" | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            palette: string;
            mode: "gradient";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
        }> | undefined;
        label?: string | undefined;
        summary?: Readonly<{
            label?: string | undefined;
        } & {
            type: "min" | "max" | "count" | "sum" | "avg";
        }> | undefined;
        width?: number | undefined;
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
        visible?: boolean | undefined;
        alignment?: "center" | "left" | "right" | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        apply_color_to?: "background" | "value" | "badge" | undefined;
    } & {
        field: string;
        operation: "sum";
        empty_as_null: boolean;
    }> | Readonly<{
        color?: Readonly<{} & {
            type: "legacy_dynamic";
            palette: string;
            shift: boolean;
            range: "absolute" | "percentage";
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
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mapping: Readonly<{} & {
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[] | undefined;
            sort?: "desc" | "asc" | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            palette: string;
            mode: "gradient";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
        }> | undefined;
        label?: string | undefined;
        summary?: Readonly<{
            label?: string | undefined;
        } & {
            type: "min" | "max" | "count" | "sum" | "avg";
        }> | undefined;
        width?: number | undefined;
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
        visible?: boolean | undefined;
        alignment?: "center" | "left" | "right" | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        apply_color_to?: "background" | "value" | "badge" | undefined;
    } & {
        field: string;
        operation: "last_value";
        time_field: string;
        multi_value: boolean;
    }> | Readonly<{
        color?: Readonly<{} & {
            type: "legacy_dynamic";
            palette: string;
            shift: boolean;
            range: "absolute" | "percentage";
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
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mapping: Readonly<{} & {
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[] | undefined;
            sort?: "desc" | "asc" | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            palette: string;
            mode: "gradient";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
        }> | undefined;
        label?: string | undefined;
        summary?: Readonly<{
            label?: string | undefined;
        } & {
            type: "min" | "max" | "count" | "sum" | "avg";
        }> | undefined;
        width?: number | undefined;
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
        visible?: boolean | undefined;
        alignment?: "center" | "left" | "right" | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        apply_color_to?: "background" | "value" | "badge" | undefined;
    } & {
        field: string;
        percentile: number;
        operation: "percentile";
    }> | Readonly<{
        color?: Readonly<{} & {
            type: "legacy_dynamic";
            palette: string;
            shift: boolean;
            range: "absolute" | "percentage";
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
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mapping: Readonly<{} & {
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[] | undefined;
            sort?: "desc" | "asc" | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            palette: string;
            mode: "gradient";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
        }> | undefined;
        label?: string | undefined;
        summary?: Readonly<{
            label?: string | undefined;
        } & {
            type: "min" | "max" | "count" | "sum" | "avg";
        }> | undefined;
        width?: number | undefined;
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
        visible?: boolean | undefined;
        alignment?: "center" | "left" | "right" | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        apply_color_to?: "background" | "value" | "badge" | undefined;
    } & {
        field: string;
        rank: number;
        operation: "percentile_rank";
    }> | Readonly<{
        color?: Readonly<{} & {
            type: "legacy_dynamic";
            palette: string;
            shift: boolean;
            range: "absolute" | "percentage";
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
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mapping: Readonly<{} & {
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[] | undefined;
            sort?: "desc" | "asc" | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            palette: string;
            mode: "gradient";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
        }> | undefined;
        label?: string | undefined;
        summary?: Readonly<{
            label?: string | undefined;
        } & {
            type: "min" | "max" | "count" | "sum" | "avg";
        }> | undefined;
        width?: number | undefined;
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
        visible?: boolean | undefined;
        alignment?: "center" | "left" | "right" | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        apply_color_to?: "background" | "value" | "badge" | undefined;
    } & {
        operation: "differences";
        of: Readonly<{
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            operation: "count";
            empty_as_null: boolean;
        }> | Readonly<{
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            field: string;
            operation: "unique_count";
            empty_as_null: boolean;
        }> | Readonly<{
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            field: string;
            operation: "min" | "max" | "average" | "median" | "standard_deviation";
        }> | Readonly<{
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            field: string;
            operation: "sum";
            empty_as_null: boolean;
        }> | Readonly<{
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
            time_scale?: "s" | "h" | "d" | "m" | undefined;
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
                language: "kql" | "lucene";
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
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            field: string;
            percentile: number;
            operation: "percentile";
        }> | Readonly<{
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            field: string;
            rank: number;
            operation: "percentile_rank";
        }>;
    }> | Readonly<{
        color?: Readonly<{} & {
            type: "legacy_dynamic";
            palette: string;
            shift: boolean;
            range: "absolute" | "percentage";
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
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mapping: Readonly<{} & {
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[] | undefined;
            sort?: "desc" | "asc" | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            palette: string;
            mode: "gradient";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
        }> | undefined;
        label?: string | undefined;
        summary?: Readonly<{
            label?: string | undefined;
        } & {
            type: "min" | "max" | "count" | "sum" | "avg";
        }> | undefined;
        width?: number | undefined;
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
        visible?: boolean | undefined;
        alignment?: "center" | "left" | "right" | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        apply_color_to?: "background" | "value" | "badge" | undefined;
    } & {
        window: number;
        operation: "moving_average";
        of: Readonly<{
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            operation: "count";
            empty_as_null: boolean;
        }> | Readonly<{
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            field: string;
            operation: "unique_count";
            empty_as_null: boolean;
        }> | Readonly<{
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            field: string;
            operation: "min" | "max" | "average" | "median" | "standard_deviation";
        }> | Readonly<{
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            field: string;
            operation: "sum";
            empty_as_null: boolean;
        }> | Readonly<{
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
            time_scale?: "s" | "h" | "d" | "m" | undefined;
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
                language: "kql" | "lucene";
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
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            field: string;
            percentile: number;
            operation: "percentile";
        }> | Readonly<{
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            field: string;
            rank: number;
            operation: "percentile_rank";
        }>;
    }> | Readonly<{
        color?: Readonly<{} & {
            type: "legacy_dynamic";
            palette: string;
            shift: boolean;
            range: "absolute" | "percentage";
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
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mapping: Readonly<{} & {
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[] | undefined;
            sort?: "desc" | "asc" | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            palette: string;
            mode: "gradient";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
        }> | undefined;
        label?: string | undefined;
        summary?: Readonly<{
            label?: string | undefined;
        } & {
            type: "min" | "max" | "count" | "sum" | "avg";
        }> | undefined;
        width?: number | undefined;
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
        visible?: boolean | undefined;
        alignment?: "center" | "left" | "right" | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        apply_color_to?: "background" | "value" | "badge" | undefined;
    } & {
        field: string;
        operation: "cumulative_sum";
    }> | Readonly<{
        color?: Readonly<{} & {
            type: "legacy_dynamic";
            palette: string;
            shift: boolean;
            range: "absolute" | "percentage";
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
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mapping: Readonly<{} & {
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[] | undefined;
            sort?: "desc" | "asc" | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            palette: string;
            mode: "gradient";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
        }> | undefined;
        label?: string | undefined;
        summary?: Readonly<{
            label?: string | undefined;
        } & {
            type: "min" | "max" | "count" | "sum" | "avg";
        }> | undefined;
        width?: number | undefined;
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
        visible?: boolean | undefined;
        alignment?: "center" | "left" | "right" | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        apply_color_to?: "background" | "value" | "badge" | undefined;
    } & {
        field: string;
        operation: "counter_rate";
    }> | Readonly<{
        color?: Readonly<{} & {
            type: "legacy_dynamic";
            palette: string;
            shift: boolean;
            range: "absolute" | "percentage";
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
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mapping: Readonly<{} & {
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[] | undefined;
            sort?: "desc" | "asc" | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            palette: string;
            mode: "gradient";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
        }> | undefined;
        label?: string | undefined;
        summary?: Readonly<{
            label?: string | undefined;
        } & {
            type: "min" | "max" | "count" | "sum" | "avg";
        }> | undefined;
        width?: number | undefined;
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
        visible?: boolean | undefined;
        alignment?: "center" | "left" | "right" | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        apply_color_to?: "background" | "value" | "badge" | undefined;
    } & {
        formula: string;
        operation: "formula";
    }>)[];
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
}> | Readonly<{
    title?: string | undefined;
    description?: string | undefined;
    rows?: Readonly<{
        color?: Readonly<{} & {
            type: "legacy_dynamic";
            palette: string;
            shift: boolean;
            range: "absolute" | "percentage";
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
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mapping: Readonly<{} & {
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[] | undefined;
            sort?: "desc" | "asc" | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            palette: string;
            mode: "gradient";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        width?: number | undefined;
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
        visible?: boolean | undefined;
        alignment?: "center" | "left" | "right" | undefined;
        apply_color_to?: "background" | "value" | "badge" | undefined;
        collapse_by?: "min" | "max" | "sum" | "avg" | undefined;
        click_filter?: boolean | undefined;
    } & {
        column: string;
    }>[] | undefined;
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
    metrics?: Readonly<{
        color?: Readonly<{} & {
            type: "legacy_dynamic";
            palette: string;
            shift: boolean;
            range: "absolute" | "percentage";
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
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                gte?: number | null | undefined;
                lte?: number | null | undefined;
                lt?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mapping: Readonly<{} & {
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[] | undefined;
            sort?: "desc" | "asc" | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            palette: string;
            mode: "gradient";
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        summary?: Readonly<{
            label?: string | undefined;
        } & {
            type: "min" | "max" | "count" | "sum" | "avg";
        }> | undefined;
        width?: number | undefined;
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
        visible?: boolean | undefined;
        alignment?: "center" | "left" | "right" | undefined;
        apply_color_to?: "background" | "value" | "badge" | undefined;
    } & {
        column: string;
    }>[] | undefined;
    styling?: Readonly<{
        sort_by?: Readonly<{} & {
            index: number;
            direction: "desc" | "asc";
            column_type: "metric" | "row";
        }> | Readonly<{} & {
            index: number;
            values: string[];
            direction: "desc" | "asc";
            column_type: "pivoted_metric";
        }> | undefined;
        density?: Readonly<{
            mode?: "default" | "compact" | "expanded" | undefined;
            height?: Readonly<{
                header?: Readonly<{} & {
                    type: "auto";
                }> | Readonly<{} & {
                    type: "custom";
                    max_lines: number;
                }> | undefined;
                value?: Readonly<{} & {
                    type: "auto";
                }> | Readonly<{} & {
                    type: "custom";
                    lines: number;
                }> | undefined;
            } & {}> | undefined;
        } & {}> | undefined;
        paging?: 100 | 10 | 20 | 50 | 30 | undefined;
        row_numbers?: Readonly<{} & {
            visible: boolean;
        }> | undefined;
    } & {}> | undefined;
    split_metrics_by?: Readonly<{
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
    } & {
        column: string;
    }>[] | undefined;
} & {
    type: "data_table";
    data_source: Readonly<{} & {
        type: "esql";
        query: string;
    }>;
    sampling: number;
    ignore_global_filters: boolean;
}>>;
export type DatatableConfig = TypeOf<typeof datatableConfigSchema>;
export type DatatableConfigNoESQL = TypeOf<typeof datatableConfigSchemaNoESQL>;
export type DatatableConfigESQL = TypeOf<typeof datatableConfigSchemaESQL>;
