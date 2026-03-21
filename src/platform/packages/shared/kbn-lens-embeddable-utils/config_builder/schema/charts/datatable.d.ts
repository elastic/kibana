import type { TypeOf } from '@kbn/config-schema';
export declare const datatableStateSchemaNoESQL: import("@kbn/config-schema").ObjectType<{
    /**
     * Metric columns configuration, must define operation.
     */
    metrics: import("@kbn/config-schema").Type<(Readonly<{
        width?: number | undefined;
        color?: Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            palette: string;
            range: "absolute" | "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{
            unassignedColor?: Readonly<{
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
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            sort?: "desc" | "asc" | undefined;
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
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
            }>[] | undefined;
            unassignedColor?: Readonly<{
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
        }> | undefined;
        field?: string | undefined;
        filter?: Readonly<{} & {
            query: string;
            language: "kuery" | "lucene";
        }> | undefined;
        label?: string | undefined;
        summary?: Readonly<{
            label?: string | undefined;
        } & {
            type: "max" | "min" | "count" | "avg" | "sum";
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            pattern: string;
            type: "custom";
        }> | undefined;
        visible?: boolean | undefined;
        alignment?: "left" | "right" | "center" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        apply_color_to?: "background" | "value" | undefined;
    } & {
        operation: "count";
        empty_as_null: boolean;
    }> | Readonly<{
        width?: number | undefined;
        color?: Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            palette: string;
            range: "absolute" | "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{
            unassignedColor?: Readonly<{
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
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            sort?: "desc" | "asc" | undefined;
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
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
            }>[] | undefined;
            unassignedColor?: Readonly<{
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
        }> | undefined;
        filter?: Readonly<{} & {
            query: string;
            language: "kuery" | "lucene";
        }> | undefined;
        label?: string | undefined;
        summary?: Readonly<{
            label?: string | undefined;
        } & {
            type: "max" | "min" | "count" | "avg" | "sum";
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            pattern: string;
            type: "custom";
        }> | undefined;
        visible?: boolean | undefined;
        alignment?: "left" | "right" | "center" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        apply_color_to?: "background" | "value" | undefined;
    } & {
        field: string;
        operation: "unique_count";
        empty_as_null: boolean;
    }> | Readonly<{
        width?: number | undefined;
        color?: Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            palette: string;
            range: "absolute" | "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{
            unassignedColor?: Readonly<{
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
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            sort?: "desc" | "asc" | undefined;
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
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
            }>[] | undefined;
            unassignedColor?: Readonly<{
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
        }> | undefined;
        filter?: Readonly<{} & {
            query: string;
            language: "kuery" | "lucene";
        }> | undefined;
        label?: string | undefined;
        summary?: Readonly<{
            label?: string | undefined;
        } & {
            type: "max" | "min" | "count" | "avg" | "sum";
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            pattern: string;
            type: "custom";
        }> | undefined;
        visible?: boolean | undefined;
        alignment?: "left" | "right" | "center" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        apply_color_to?: "background" | "value" | undefined;
    } & {
        field: string;
        operation: "max" | "min" | "median" | "average" | "standard_deviation";
    }> | Readonly<{
        width?: number | undefined;
        color?: Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            palette: string;
            range: "absolute" | "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{
            unassignedColor?: Readonly<{
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
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            sort?: "desc" | "asc" | undefined;
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
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
            }>[] | undefined;
            unassignedColor?: Readonly<{
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
        }> | undefined;
        filter?: Readonly<{} & {
            query: string;
            language: "kuery" | "lucene";
        }> | undefined;
        label?: string | undefined;
        summary?: Readonly<{
            label?: string | undefined;
        } & {
            type: "max" | "min" | "count" | "avg" | "sum";
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            pattern: string;
            type: "custom";
        }> | undefined;
        visible?: boolean | undefined;
        alignment?: "left" | "right" | "center" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        apply_color_to?: "background" | "value" | undefined;
    } & {
        field: string;
        operation: "sum";
        empty_as_null: boolean;
    }> | Readonly<{
        width?: number | undefined;
        color?: Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            palette: string;
            range: "absolute" | "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{
            unassignedColor?: Readonly<{
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
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            sort?: "desc" | "asc" | undefined;
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
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
            }>[] | undefined;
            unassignedColor?: Readonly<{
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
        }> | undefined;
        filter?: Readonly<{} & {
            query: string;
            language: "kuery" | "lucene";
        }> | undefined;
        label?: string | undefined;
        summary?: Readonly<{
            label?: string | undefined;
        } & {
            type: "max" | "min" | "count" | "avg" | "sum";
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            pattern: string;
            type: "custom";
        }> | undefined;
        visible?: boolean | undefined;
        alignment?: "left" | "right" | "center" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        apply_color_to?: "background" | "value" | undefined;
    } & {
        field: string;
        operation: "last_value";
        sort_by: string;
        show_array_values: boolean;
    }> | Readonly<{
        width?: number | undefined;
        color?: Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            palette: string;
            range: "absolute" | "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{
            unassignedColor?: Readonly<{
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
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            sort?: "desc" | "asc" | undefined;
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
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
            }>[] | undefined;
            unassignedColor?: Readonly<{
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
        }> | undefined;
        filter?: Readonly<{} & {
            query: string;
            language: "kuery" | "lucene";
        }> | undefined;
        label?: string | undefined;
        summary?: Readonly<{
            label?: string | undefined;
        } & {
            type: "max" | "min" | "count" | "avg" | "sum";
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            pattern: string;
            type: "custom";
        }> | undefined;
        visible?: boolean | undefined;
        alignment?: "left" | "right" | "center" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        apply_color_to?: "background" | "value" | undefined;
    } & {
        field: string;
        operation: "percentile";
        percentile: number;
    }> | Readonly<{
        width?: number | undefined;
        color?: Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            palette: string;
            range: "absolute" | "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{
            unassignedColor?: Readonly<{
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
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            sort?: "desc" | "asc" | undefined;
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
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
            }>[] | undefined;
            unassignedColor?: Readonly<{
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
        }> | undefined;
        filter?: Readonly<{} & {
            query: string;
            language: "kuery" | "lucene";
        }> | undefined;
        label?: string | undefined;
        summary?: Readonly<{
            label?: string | undefined;
        } & {
            type: "max" | "min" | "count" | "avg" | "sum";
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            pattern: string;
            type: "custom";
        }> | undefined;
        visible?: boolean | undefined;
        alignment?: "left" | "right" | "center" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        apply_color_to?: "background" | "value" | undefined;
    } & {
        field: string;
        operation: "percentile_rank";
        rank: number;
    }> | Readonly<{
        width?: number | undefined;
        color?: Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            palette: string;
            range: "absolute" | "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{
            unassignedColor?: Readonly<{
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
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            sort?: "desc" | "asc" | undefined;
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
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
            }>[] | undefined;
            unassignedColor?: Readonly<{
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
        }> | undefined;
        filter?: Readonly<{} & {
            query: string;
            language: "kuery" | "lucene";
        }> | undefined;
        label?: string | undefined;
        summary?: Readonly<{
            label?: string | undefined;
        } & {
            type: "max" | "min" | "count" | "avg" | "sum";
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            pattern: string;
            type: "custom";
        }> | undefined;
        visible?: boolean | undefined;
        alignment?: "left" | "right" | "center" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        apply_color_to?: "background" | "value" | undefined;
    } & {
        operation: "differences";
        of: Readonly<{
            field?: string | undefined;
            filter?: Readonly<{} & {
                query: string;
                language: "kuery" | "lucene";
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
                pattern: string;
                type: "custom";
            }> | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
        } & {
            operation: "count";
            empty_as_null: boolean;
        }> | Readonly<{
            filter?: Readonly<{} & {
                query: string;
                language: "kuery" | "lucene";
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
                pattern: string;
                type: "custom";
            }> | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
        } & {
            field: string;
            operation: "unique_count";
            empty_as_null: boolean;
        }> | Readonly<{
            filter?: Readonly<{} & {
                query: string;
                language: "kuery" | "lucene";
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
                pattern: string;
                type: "custom";
            }> | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
        } & {
            field: string;
            operation: "max" | "min" | "median" | "average" | "standard_deviation";
        }> | Readonly<{
            filter?: Readonly<{} & {
                query: string;
                language: "kuery" | "lucene";
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
                pattern: string;
                type: "custom";
            }> | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
        } & {
            field: string;
            operation: "sum";
            empty_as_null: boolean;
        }> | Readonly<{
            filter?: Readonly<{} & {
                query: string;
                language: "kuery" | "lucene";
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
                pattern: string;
                type: "custom";
            }> | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
        } & {
            field: string;
            operation: "last_value";
            sort_by: string;
            show_array_values: boolean;
        }> | Readonly<{
            filter?: Readonly<{} & {
                query: string;
                language: "kuery" | "lucene";
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
                pattern: string;
                type: "custom";
            }> | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
        } & {
            field: string;
            operation: "percentile";
            percentile: number;
        }> | Readonly<{
            filter?: Readonly<{} & {
                query: string;
                language: "kuery" | "lucene";
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
                pattern: string;
                type: "custom";
            }> | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
        } & {
            field: string;
            operation: "percentile_rank";
            rank: number;
        }>;
    }> | Readonly<{
        width?: number | undefined;
        color?: Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            palette: string;
            range: "absolute" | "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{
            unassignedColor?: Readonly<{
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
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            sort?: "desc" | "asc" | undefined;
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
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
            }>[] | undefined;
            unassignedColor?: Readonly<{
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
        }> | undefined;
        filter?: Readonly<{} & {
            query: string;
            language: "kuery" | "lucene";
        }> | undefined;
        label?: string | undefined;
        summary?: Readonly<{
            label?: string | undefined;
        } & {
            type: "max" | "min" | "count" | "avg" | "sum";
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            pattern: string;
            type: "custom";
        }> | undefined;
        visible?: boolean | undefined;
        alignment?: "left" | "right" | "center" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        apply_color_to?: "background" | "value" | undefined;
    } & {
        operation: "moving_average";
        window: number;
        of: Readonly<{
            field?: string | undefined;
            filter?: Readonly<{} & {
                query: string;
                language: "kuery" | "lucene";
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
                pattern: string;
                type: "custom";
            }> | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
        } & {
            operation: "count";
            empty_as_null: boolean;
        }> | Readonly<{
            filter?: Readonly<{} & {
                query: string;
                language: "kuery" | "lucene";
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
                pattern: string;
                type: "custom";
            }> | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
        } & {
            field: string;
            operation: "unique_count";
            empty_as_null: boolean;
        }> | Readonly<{
            filter?: Readonly<{} & {
                query: string;
                language: "kuery" | "lucene";
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
                pattern: string;
                type: "custom";
            }> | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
        } & {
            field: string;
            operation: "max" | "min" | "median" | "average" | "standard_deviation";
        }> | Readonly<{
            filter?: Readonly<{} & {
                query: string;
                language: "kuery" | "lucene";
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
                pattern: string;
                type: "custom";
            }> | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
        } & {
            field: string;
            operation: "sum";
            empty_as_null: boolean;
        }> | Readonly<{
            filter?: Readonly<{} & {
                query: string;
                language: "kuery" | "lucene";
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
                pattern: string;
                type: "custom";
            }> | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
        } & {
            field: string;
            operation: "last_value";
            sort_by: string;
            show_array_values: boolean;
        }> | Readonly<{
            filter?: Readonly<{} & {
                query: string;
                language: "kuery" | "lucene";
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
                pattern: string;
                type: "custom";
            }> | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
        } & {
            field: string;
            operation: "percentile";
            percentile: number;
        }> | Readonly<{
            filter?: Readonly<{} & {
                query: string;
                language: "kuery" | "lucene";
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
                pattern: string;
                type: "custom";
            }> | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
        } & {
            field: string;
            operation: "percentile_rank";
            rank: number;
        }>;
    }> | Readonly<{
        width?: number | undefined;
        color?: Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            palette: string;
            range: "absolute" | "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{
            unassignedColor?: Readonly<{
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
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            sort?: "desc" | "asc" | undefined;
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
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
            }>[] | undefined;
            unassignedColor?: Readonly<{
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
        }> | undefined;
        filter?: Readonly<{} & {
            query: string;
            language: "kuery" | "lucene";
        }> | undefined;
        label?: string | undefined;
        summary?: Readonly<{
            label?: string | undefined;
        } & {
            type: "max" | "min" | "count" | "avg" | "sum";
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            pattern: string;
            type: "custom";
        }> | undefined;
        visible?: boolean | undefined;
        alignment?: "left" | "right" | "center" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        apply_color_to?: "background" | "value" | undefined;
    } & {
        field: string;
        operation: "cumulative_sum";
    }> | Readonly<{
        width?: number | undefined;
        color?: Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            palette: string;
            range: "absolute" | "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{
            unassignedColor?: Readonly<{
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
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            sort?: "desc" | "asc" | undefined;
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
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
            }>[] | undefined;
            unassignedColor?: Readonly<{
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
        }> | undefined;
        filter?: Readonly<{} & {
            query: string;
            language: "kuery" | "lucene";
        }> | undefined;
        label?: string | undefined;
        summary?: Readonly<{
            label?: string | undefined;
        } & {
            type: "max" | "min" | "count" | "avg" | "sum";
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            pattern: string;
            type: "custom";
        }> | undefined;
        visible?: boolean | undefined;
        alignment?: "left" | "right" | "center" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        apply_color_to?: "background" | "value" | undefined;
    } & {
        field: string;
        operation: "counter_rate";
    }> | Readonly<{
        width?: number | undefined;
        color?: Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            palette: string;
            range: "absolute" | "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{
            unassignedColor?: Readonly<{
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
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            sort?: "desc" | "asc" | undefined;
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
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
            }>[] | undefined;
            unassignedColor?: Readonly<{
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
        }> | undefined;
        filter?: Readonly<{} & {
            query: string;
            language: "kuery" | "lucene";
        }> | undefined;
        label?: string | undefined;
        summary?: Readonly<{
            label?: string | undefined;
        } & {
            type: "max" | "min" | "count" | "avg" | "sum";
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            pattern: string;
            type: "custom";
        }> | undefined;
        visible?: boolean | undefined;
        alignment?: "left" | "right" | "center" | undefined;
        reduced_time_range?: string | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        apply_color_to?: "background" | "value" | undefined;
    } & {
        operation: "formula";
        formula: string;
    }>)[]>;
    /**
     * Row configuration, optional bucket operations.
     */
    rows: import("@kbn/config-schema").Type<(Readonly<{
        width?: number | undefined;
        color?: Readonly<{
            unassignedColor?: Readonly<{
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
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            sort?: "desc" | "asc" | undefined;
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
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
            }>[] | undefined;
            unassignedColor?: Readonly<{
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
        }> | undefined;
        label?: string | undefined;
        visible?: boolean | undefined;
        alignment?: "left" | "right" | "center" | undefined;
        drop_partial_intervals?: boolean | undefined;
        apply_color_to?: "background" | "value" | undefined;
        collapse_by?: "max" | "min" | "avg" | "sum" | undefined;
        click_filter?: boolean | undefined;
    } & {
        field: string;
        operation: "date_histogram";
        suggested_interval: string;
        use_original_time_range: boolean;
        include_empty_rows: boolean;
    }> | Readonly<{
        width?: number | undefined;
        color?: Readonly<{
            unassignedColor?: Readonly<{
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
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            sort?: "desc" | "asc" | undefined;
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
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
            }>[] | undefined;
            unassignedColor?: Readonly<{
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
        }> | undefined;
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
            pattern: string;
            type: "custom";
        }> | undefined;
        visible?: boolean | undefined;
        alignment?: "left" | "right" | "center" | undefined;
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
            direction: "desc" | "asc";
            type: "alphabetical";
        }> | Readonly<{} & {
            type: "rare";
            max: number;
        }> | Readonly<{} & {
            type: "significant";
        }> | Readonly<{} & {
            direction: "desc" | "asc";
            type: "column";
            metric: number;
        }> | Readonly<{} & {
            field: string;
            direction: "desc" | "asc";
            type: "custom";
            operation: "max" | "min" | "count" | "median" | "sum" | "percentile" | "average" | "unique_count" | "last_value" | "percentile_rank" | "standard_deviation";
        }> | undefined;
        apply_color_to?: "background" | "value" | undefined;
        collapse_by?: "max" | "min" | "avg" | "sum" | undefined;
        click_filter?: boolean | undefined;
    } & {
        size: number;
        operation: "terms";
        fields: string[];
    }> | Readonly<{
        width?: number | undefined;
        color?: Readonly<{
            unassignedColor?: Readonly<{
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
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            sort?: "desc" | "asc" | undefined;
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
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
            }>[] | undefined;
            unassignedColor?: Readonly<{
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
            pattern: string;
            type: "custom";
        }> | undefined;
        visible?: boolean | undefined;
        alignment?: "left" | "right" | "center" | undefined;
        apply_color_to?: "background" | "value" | undefined;
        collapse_by?: "max" | "min" | "avg" | "sum" | undefined;
        click_filter?: boolean | undefined;
    } & {
        field: string;
        operation: "histogram";
        include_empty_rows: boolean;
        granularity: number | "auto";
    }> | Readonly<{
        width?: number | undefined;
        color?: Readonly<{
            unassignedColor?: Readonly<{
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
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            sort?: "desc" | "asc" | undefined;
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
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
            }>[] | undefined;
            unassignedColor?: Readonly<{
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
            pattern: string;
            type: "custom";
        }> | undefined;
        visible?: boolean | undefined;
        alignment?: "left" | "right" | "center" | undefined;
        apply_color_to?: "background" | "value" | undefined;
        collapse_by?: "max" | "min" | "avg" | "sum" | undefined;
        click_filter?: boolean | undefined;
    } & {
        field: string;
        operation: "range";
        ranges: Readonly<{
            label?: string | undefined;
            gt?: number | undefined;
            lte?: number | undefined;
        } & {}>[];
    }> | Readonly<{
        width?: number | undefined;
        color?: Readonly<{
            unassignedColor?: Readonly<{
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
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            sort?: "desc" | "asc" | undefined;
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
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
            }>[] | undefined;
            unassignedColor?: Readonly<{
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
        }> | undefined;
        label?: string | undefined;
        visible?: boolean | undefined;
        alignment?: "left" | "right" | "center" | undefined;
        apply_color_to?: "background" | "value" | undefined;
        collapse_by?: "max" | "min" | "avg" | "sum" | undefined;
        click_filter?: boolean | undefined;
    } & {
        filters: Readonly<{
            label?: string | undefined;
        } & {
            filter: Readonly<{} & {
                query: string;
                language: "kuery" | "lucene";
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
            pattern: string;
            type: "custom";
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
            direction: "desc" | "asc";
            type: "alphabetical";
        }> | Readonly<{} & {
            type: "rare";
            max: number;
        }> | Readonly<{} & {
            type: "significant";
        }> | Readonly<{} & {
            direction: "desc" | "asc";
            type: "column";
            metric: number;
        }> | Readonly<{} & {
            field: string;
            direction: "desc" | "asc";
            type: "custom";
            operation: "max" | "min" | "count" | "median" | "sum" | "percentile" | "average" | "unique_count" | "last_value" | "percentile_rank" | "standard_deviation";
        }> | undefined;
    } & {
        size: number;
        operation: "terms";
        fields: string[];
    }> | Readonly<{
        label?: string | undefined;
    } & {
        filters: Readonly<{
            label?: string | undefined;
        } & {
            filter: Readonly<{} & {
                query: string;
                language: "kuery" | "lucene";
            }>;
        }>[];
        operation: "filters";
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
            pattern: string;
            type: "custom";
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
            pattern: string;
            type: "custom";
        }> | undefined;
    } & {
        field: string;
        operation: "range";
        ranges: Readonly<{
            label?: string | undefined;
            gt?: number | undefined;
            lte?: number | undefined;
        } & {}>[];
    }>)[] | undefined>;
    /**
     * Density  configuration
     */
    density: import("@kbn/config-schema").Type<Readonly<{
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
        mode?: "default" | "expanded" | "compact" | undefined;
    } & {}> | undefined>;
    /**
     * Paging configuration
     */
    paging: import("@kbn/config-schema").Type<100 | 10 | 50 | 20 | 30 | undefined>;
    /**
     * Sorting configuration
     */
    sort_by: import("@kbn/config-schema").Type<Readonly<{} & {
        direction: "desc" | "asc";
        index: number;
        column_type: "row" | "metric";
    }> | Readonly<{} & {
        values: string[];
        direction: "desc" | "asc";
        index: number;
        column_type: "pivoted_metric";
    }> | undefined>;
    /**
     * Whether to show row numbers
     */
    show_row_numbers: import("@kbn/config-schema").Type<boolean | undefined>;
    dataset: import("@kbn/config-schema").Type<Readonly<{} & {
        id: string;
        type: "dataView";
    }> | Readonly<{
        time_field?: string | undefined;
        runtime_fields?: Readonly<{
            format?: any;
        } & {
            type: string;
            name: string;
        }>[] | undefined;
    } & {
        type: "index";
        index: string;
    }>>;
    ignore_global_filters: import("@kbn/config-schema").Type<boolean>;
    sampling: import("@kbn/config-schema").Type<number>;
    query: import("@kbn/config-schema").Type<Readonly<{} & {
        query: string;
        language: "kuery" | "lucene";
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
    }, "group" | "type"> & {
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
        type: import("@kbn/config-schema").Type<"group">;
    }) | (Omit<{
        disabled: import("@kbn/config-schema").Type<boolean | undefined>;
        negate: import("@kbn/config-schema").Type<boolean | undefined>;
        controlled_by: import("@kbn/config-schema").Type<string | undefined>;
        data_view_id: import("@kbn/config-schema").Type<string | undefined>;
        label: import("@kbn/config-schema").Type<string | undefined>;
        is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
    }, "field" | "type" | "params" | "dsl"> & {
        field: import("@kbn/config-schema").Type<string | undefined>;
        type: import("@kbn/config-schema").Type<"dsl">;
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
export declare const datatableStateSchemaESQL: import("@kbn/config-schema").ObjectType<{
    /**
     * Metric columns configuration, must define operation.
     */
    metrics: import("@kbn/config-schema").Type<Readonly<{
        width?: number | undefined;
        color?: Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            palette: string;
            range: "absolute" | "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{
            unassignedColor?: Readonly<{
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
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            sort?: "desc" | "asc" | undefined;
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
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
            }>[] | undefined;
            unassignedColor?: Readonly<{
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
        }> | undefined;
        label?: string | undefined;
        summary?: Readonly<{
            label?: string | undefined;
        } & {
            type: "max" | "min" | "count" | "avg" | "sum";
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            pattern: string;
            type: "custom";
        }> | undefined;
        visible?: boolean | undefined;
        alignment?: "left" | "right" | "center" | undefined;
        apply_color_to?: "background" | "value" | undefined;
    } & {
        operation: "value";
        column: string;
    }>[] | undefined>;
    /**
     * Row configuration, optional operations.
     */
    rows: import("@kbn/config-schema").Type<Readonly<{
        width?: number | undefined;
        color?: Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            palette: string;
            range: "absolute" | "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{
            unassignedColor?: Readonly<{
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
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            sort?: "desc" | "asc" | undefined;
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
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
            }>[] | undefined;
            unassignedColor?: Readonly<{
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
        }> | undefined;
        visible?: boolean | undefined;
        alignment?: "left" | "right" | "center" | undefined;
        apply_color_to?: "background" | "value" | undefined;
        collapse_by?: "max" | "min" | "avg" | "sum" | undefined;
        click_filter?: boolean | undefined;
    } & {
        operation: "value";
        column: string;
    }>[] | undefined>;
    /**
     * Split metrics by configuration, optional operations.
     */
    split_metrics_by: import("@kbn/config-schema").Type<Readonly<{} & {
        operation: "value";
        column: string;
    }>[] | undefined>;
    /**
     * Density  configuration
     */
    density: import("@kbn/config-schema").Type<Readonly<{
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
        mode?: "default" | "expanded" | "compact" | undefined;
    } & {}> | undefined>;
    /**
     * Paging configuration
     */
    paging: import("@kbn/config-schema").Type<100 | 10 | 50 | 20 | 30 | undefined>;
    /**
     * Sorting configuration
     */
    sort_by: import("@kbn/config-schema").Type<Readonly<{} & {
        direction: "desc" | "asc";
        index: number;
        column_type: "row" | "metric";
    }> | Readonly<{} & {
        values: string[];
        direction: "desc" | "asc";
        index: number;
        column_type: "pivoted_metric";
    }> | undefined>;
    /**
     * Whether to show row numbers
     */
    show_row_numbers: import("@kbn/config-schema").Type<boolean | undefined>;
    dataset: import("@kbn/config-schema").Type<Readonly<{} & {
        type: "esql";
        query: string;
    }> | Readonly<{
        table?: any;
    } & {
        type: "table";
    }>>;
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
    }, "group" | "type"> & {
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
        type: import("@kbn/config-schema").Type<"group">;
    }) | (Omit<{
        disabled: import("@kbn/config-schema").Type<boolean | undefined>;
        negate: import("@kbn/config-schema").Type<boolean | undefined>;
        controlled_by: import("@kbn/config-schema").Type<string | undefined>;
        data_view_id: import("@kbn/config-schema").Type<string | undefined>;
        label: import("@kbn/config-schema").Type<string | undefined>;
        is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
    }, "field" | "type" | "params" | "dsl"> & {
        field: import("@kbn/config-schema").Type<string | undefined>;
        type: import("@kbn/config-schema").Type<"dsl">;
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
export declare const datatableStateSchema: import("@kbn/config-schema").Type<Readonly<{
    title?: string | undefined;
    description?: string | undefined;
    rows?: (Readonly<{
        width?: number | undefined;
        color?: Readonly<{
            unassignedColor?: Readonly<{
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
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            sort?: "desc" | "asc" | undefined;
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
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
            }>[] | undefined;
            unassignedColor?: Readonly<{
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
        }> | undefined;
        label?: string | undefined;
        visible?: boolean | undefined;
        alignment?: "left" | "right" | "center" | undefined;
        drop_partial_intervals?: boolean | undefined;
        apply_color_to?: "background" | "value" | undefined;
        collapse_by?: "max" | "min" | "avg" | "sum" | undefined;
        click_filter?: boolean | undefined;
    } & {
        field: string;
        operation: "date_histogram";
        suggested_interval: string;
        use_original_time_range: boolean;
        include_empty_rows: boolean;
    }> | Readonly<{
        width?: number | undefined;
        color?: Readonly<{
            unassignedColor?: Readonly<{
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
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            sort?: "desc" | "asc" | undefined;
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
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
            }>[] | undefined;
            unassignedColor?: Readonly<{
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
        }> | undefined;
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
            pattern: string;
            type: "custom";
        }> | undefined;
        visible?: boolean | undefined;
        alignment?: "left" | "right" | "center" | undefined;
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
            direction: "desc" | "asc";
            type: "alphabetical";
        }> | Readonly<{} & {
            type: "rare";
            max: number;
        }> | Readonly<{} & {
            type: "significant";
        }> | Readonly<{} & {
            direction: "desc" | "asc";
            type: "column";
            metric: number;
        }> | Readonly<{} & {
            field: string;
            direction: "desc" | "asc";
            type: "custom";
            operation: "max" | "min" | "count" | "median" | "sum" | "percentile" | "average" | "unique_count" | "last_value" | "percentile_rank" | "standard_deviation";
        }> | undefined;
        apply_color_to?: "background" | "value" | undefined;
        collapse_by?: "max" | "min" | "avg" | "sum" | undefined;
        click_filter?: boolean | undefined;
    } & {
        size: number;
        operation: "terms";
        fields: string[];
    }> | Readonly<{
        width?: number | undefined;
        color?: Readonly<{
            unassignedColor?: Readonly<{
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
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            sort?: "desc" | "asc" | undefined;
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
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
            }>[] | undefined;
            unassignedColor?: Readonly<{
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
            pattern: string;
            type: "custom";
        }> | undefined;
        visible?: boolean | undefined;
        alignment?: "left" | "right" | "center" | undefined;
        apply_color_to?: "background" | "value" | undefined;
        collapse_by?: "max" | "min" | "avg" | "sum" | undefined;
        click_filter?: boolean | undefined;
    } & {
        field: string;
        operation: "histogram";
        include_empty_rows: boolean;
        granularity: number | "auto";
    }> | Readonly<{
        width?: number | undefined;
        color?: Readonly<{
            unassignedColor?: Readonly<{
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
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            sort?: "desc" | "asc" | undefined;
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
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
            }>[] | undefined;
            unassignedColor?: Readonly<{
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
            pattern: string;
            type: "custom";
        }> | undefined;
        visible?: boolean | undefined;
        alignment?: "left" | "right" | "center" | undefined;
        apply_color_to?: "background" | "value" | undefined;
        collapse_by?: "max" | "min" | "avg" | "sum" | undefined;
        click_filter?: boolean | undefined;
    } & {
        field: string;
        operation: "range";
        ranges: Readonly<{
            label?: string | undefined;
            gt?: number | undefined;
            lte?: number | undefined;
        } & {}>[];
    }> | Readonly<{
        width?: number | undefined;
        color?: Readonly<{
            unassignedColor?: Readonly<{
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
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            sort?: "desc" | "asc" | undefined;
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
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
            }>[] | undefined;
            unassignedColor?: Readonly<{
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
        }> | undefined;
        label?: string | undefined;
        visible?: boolean | undefined;
        alignment?: "left" | "right" | "center" | undefined;
        apply_color_to?: "background" | "value" | undefined;
        collapse_by?: "max" | "min" | "avg" | "sum" | undefined;
        click_filter?: boolean | undefined;
    } & {
        filters: Readonly<{
            label?: string | undefined;
        } & {
            filter: Readonly<{} & {
                query: string;
                language: "kuery" | "lucene";
            }>;
        }>[];
        operation: "filters";
    }>)[] | undefined;
    query?: Readonly<{} & {
        query: string;
        language: "kuery" | "lucene";
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
    }, "group" | "type"> & {
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
        type: import("@kbn/config-schema").Type<"group">;
    }) | (Omit<{
        disabled: import("@kbn/config-schema").Type<boolean | undefined>;
        negate: import("@kbn/config-schema").Type<boolean | undefined>;
        controlled_by: import("@kbn/config-schema").Type<string | undefined>;
        data_view_id: import("@kbn/config-schema").Type<string | undefined>;
        label: import("@kbn/config-schema").Type<string | undefined>;
        is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
    }, "field" | "type" | "params" | "dsl"> & {
        field: import("@kbn/config-schema").Type<string | undefined>;
        type: import("@kbn/config-schema").Type<"dsl">;
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
    density?: Readonly<{
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
        mode?: "default" | "expanded" | "compact" | undefined;
    } & {}> | undefined;
    sort_by?: Readonly<{} & {
        direction: "desc" | "asc";
        index: number;
        column_type: "row" | "metric";
    }> | Readonly<{} & {
        values: string[];
        direction: "desc" | "asc";
        index: number;
        column_type: "pivoted_metric";
    }> | undefined;
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
            pattern: string;
            type: "custom";
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
            direction: "desc" | "asc";
            type: "alphabetical";
        }> | Readonly<{} & {
            type: "rare";
            max: number;
        }> | Readonly<{} & {
            type: "significant";
        }> | Readonly<{} & {
            direction: "desc" | "asc";
            type: "column";
            metric: number;
        }> | Readonly<{} & {
            field: string;
            direction: "desc" | "asc";
            type: "custom";
            operation: "max" | "min" | "count" | "median" | "sum" | "percentile" | "average" | "unique_count" | "last_value" | "percentile_rank" | "standard_deviation";
        }> | undefined;
    } & {
        size: number;
        operation: "terms";
        fields: string[];
    }> | Readonly<{
        label?: string | undefined;
    } & {
        filters: Readonly<{
            label?: string | undefined;
        } & {
            filter: Readonly<{} & {
                query: string;
                language: "kuery" | "lucene";
            }>;
        }>[];
        operation: "filters";
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
            pattern: string;
            type: "custom";
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
            pattern: string;
            type: "custom";
        }> | undefined;
    } & {
        field: string;
        operation: "range";
        ranges: Readonly<{
            label?: string | undefined;
            gt?: number | undefined;
            lte?: number | undefined;
        } & {}>[];
    }>)[] | undefined;
    paging?: 100 | 10 | 50 | 20 | 30 | undefined;
    show_row_numbers?: boolean | undefined;
} & {
    type: "data_table";
    dataset: Readonly<{} & {
        id: string;
        type: "dataView";
    }> | Readonly<{
        time_field?: string | undefined;
        runtime_fields?: Readonly<{
            format?: any;
        } & {
            type: string;
            name: string;
        }>[] | undefined;
    } & {
        type: "index";
        index: string;
    }>;
    metrics: (Readonly<{
        width?: number | undefined;
        color?: Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            palette: string;
            range: "absolute" | "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{
            unassignedColor?: Readonly<{
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
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            sort?: "desc" | "asc" | undefined;
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
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
            }>[] | undefined;
            unassignedColor?: Readonly<{
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
        }> | undefined;
        field?: string | undefined;
        filter?: Readonly<{} & {
            query: string;
            language: "kuery" | "lucene";
        }> | undefined;
        label?: string | undefined;
        summary?: Readonly<{
            label?: string | undefined;
        } & {
            type: "max" | "min" | "count" | "avg" | "sum";
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            pattern: string;
            type: "custom";
        }> | undefined;
        visible?: boolean | undefined;
        alignment?: "left" | "right" | "center" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        apply_color_to?: "background" | "value" | undefined;
    } & {
        operation: "count";
        empty_as_null: boolean;
    }> | Readonly<{
        width?: number | undefined;
        color?: Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            palette: string;
            range: "absolute" | "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{
            unassignedColor?: Readonly<{
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
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            sort?: "desc" | "asc" | undefined;
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
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
            }>[] | undefined;
            unassignedColor?: Readonly<{
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
        }> | undefined;
        filter?: Readonly<{} & {
            query: string;
            language: "kuery" | "lucene";
        }> | undefined;
        label?: string | undefined;
        summary?: Readonly<{
            label?: string | undefined;
        } & {
            type: "max" | "min" | "count" | "avg" | "sum";
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            pattern: string;
            type: "custom";
        }> | undefined;
        visible?: boolean | undefined;
        alignment?: "left" | "right" | "center" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        apply_color_to?: "background" | "value" | undefined;
    } & {
        field: string;
        operation: "unique_count";
        empty_as_null: boolean;
    }> | Readonly<{
        width?: number | undefined;
        color?: Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            palette: string;
            range: "absolute" | "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{
            unassignedColor?: Readonly<{
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
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            sort?: "desc" | "asc" | undefined;
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
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
            }>[] | undefined;
            unassignedColor?: Readonly<{
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
        }> | undefined;
        filter?: Readonly<{} & {
            query: string;
            language: "kuery" | "lucene";
        }> | undefined;
        label?: string | undefined;
        summary?: Readonly<{
            label?: string | undefined;
        } & {
            type: "max" | "min" | "count" | "avg" | "sum";
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            pattern: string;
            type: "custom";
        }> | undefined;
        visible?: boolean | undefined;
        alignment?: "left" | "right" | "center" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        apply_color_to?: "background" | "value" | undefined;
    } & {
        field: string;
        operation: "max" | "min" | "median" | "average" | "standard_deviation";
    }> | Readonly<{
        width?: number | undefined;
        color?: Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            palette: string;
            range: "absolute" | "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{
            unassignedColor?: Readonly<{
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
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            sort?: "desc" | "asc" | undefined;
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
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
            }>[] | undefined;
            unassignedColor?: Readonly<{
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
        }> | undefined;
        filter?: Readonly<{} & {
            query: string;
            language: "kuery" | "lucene";
        }> | undefined;
        label?: string | undefined;
        summary?: Readonly<{
            label?: string | undefined;
        } & {
            type: "max" | "min" | "count" | "avg" | "sum";
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            pattern: string;
            type: "custom";
        }> | undefined;
        visible?: boolean | undefined;
        alignment?: "left" | "right" | "center" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        apply_color_to?: "background" | "value" | undefined;
    } & {
        field: string;
        operation: "sum";
        empty_as_null: boolean;
    }> | Readonly<{
        width?: number | undefined;
        color?: Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            palette: string;
            range: "absolute" | "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{
            unassignedColor?: Readonly<{
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
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            sort?: "desc" | "asc" | undefined;
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
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
            }>[] | undefined;
            unassignedColor?: Readonly<{
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
        }> | undefined;
        filter?: Readonly<{} & {
            query: string;
            language: "kuery" | "lucene";
        }> | undefined;
        label?: string | undefined;
        summary?: Readonly<{
            label?: string | undefined;
        } & {
            type: "max" | "min" | "count" | "avg" | "sum";
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            pattern: string;
            type: "custom";
        }> | undefined;
        visible?: boolean | undefined;
        alignment?: "left" | "right" | "center" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        apply_color_to?: "background" | "value" | undefined;
    } & {
        field: string;
        operation: "last_value";
        sort_by: string;
        show_array_values: boolean;
    }> | Readonly<{
        width?: number | undefined;
        color?: Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            palette: string;
            range: "absolute" | "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{
            unassignedColor?: Readonly<{
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
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            sort?: "desc" | "asc" | undefined;
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
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
            }>[] | undefined;
            unassignedColor?: Readonly<{
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
        }> | undefined;
        filter?: Readonly<{} & {
            query: string;
            language: "kuery" | "lucene";
        }> | undefined;
        label?: string | undefined;
        summary?: Readonly<{
            label?: string | undefined;
        } & {
            type: "max" | "min" | "count" | "avg" | "sum";
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            pattern: string;
            type: "custom";
        }> | undefined;
        visible?: boolean | undefined;
        alignment?: "left" | "right" | "center" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        apply_color_to?: "background" | "value" | undefined;
    } & {
        field: string;
        operation: "percentile";
        percentile: number;
    }> | Readonly<{
        width?: number | undefined;
        color?: Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            palette: string;
            range: "absolute" | "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{
            unassignedColor?: Readonly<{
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
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            sort?: "desc" | "asc" | undefined;
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
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
            }>[] | undefined;
            unassignedColor?: Readonly<{
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
        }> | undefined;
        filter?: Readonly<{} & {
            query: string;
            language: "kuery" | "lucene";
        }> | undefined;
        label?: string | undefined;
        summary?: Readonly<{
            label?: string | undefined;
        } & {
            type: "max" | "min" | "count" | "avg" | "sum";
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            pattern: string;
            type: "custom";
        }> | undefined;
        visible?: boolean | undefined;
        alignment?: "left" | "right" | "center" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        apply_color_to?: "background" | "value" | undefined;
    } & {
        field: string;
        operation: "percentile_rank";
        rank: number;
    }> | Readonly<{
        width?: number | undefined;
        color?: Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            palette: string;
            range: "absolute" | "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{
            unassignedColor?: Readonly<{
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
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            sort?: "desc" | "asc" | undefined;
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
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
            }>[] | undefined;
            unassignedColor?: Readonly<{
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
        }> | undefined;
        filter?: Readonly<{} & {
            query: string;
            language: "kuery" | "lucene";
        }> | undefined;
        label?: string | undefined;
        summary?: Readonly<{
            label?: string | undefined;
        } & {
            type: "max" | "min" | "count" | "avg" | "sum";
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            pattern: string;
            type: "custom";
        }> | undefined;
        visible?: boolean | undefined;
        alignment?: "left" | "right" | "center" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        apply_color_to?: "background" | "value" | undefined;
    } & {
        operation: "differences";
        of: Readonly<{
            field?: string | undefined;
            filter?: Readonly<{} & {
                query: string;
                language: "kuery" | "lucene";
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
                pattern: string;
                type: "custom";
            }> | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
        } & {
            operation: "count";
            empty_as_null: boolean;
        }> | Readonly<{
            filter?: Readonly<{} & {
                query: string;
                language: "kuery" | "lucene";
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
                pattern: string;
                type: "custom";
            }> | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
        } & {
            field: string;
            operation: "unique_count";
            empty_as_null: boolean;
        }> | Readonly<{
            filter?: Readonly<{} & {
                query: string;
                language: "kuery" | "lucene";
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
                pattern: string;
                type: "custom";
            }> | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
        } & {
            field: string;
            operation: "max" | "min" | "median" | "average" | "standard_deviation";
        }> | Readonly<{
            filter?: Readonly<{} & {
                query: string;
                language: "kuery" | "lucene";
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
                pattern: string;
                type: "custom";
            }> | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
        } & {
            field: string;
            operation: "sum";
            empty_as_null: boolean;
        }> | Readonly<{
            filter?: Readonly<{} & {
                query: string;
                language: "kuery" | "lucene";
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
                pattern: string;
                type: "custom";
            }> | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
        } & {
            field: string;
            operation: "last_value";
            sort_by: string;
            show_array_values: boolean;
        }> | Readonly<{
            filter?: Readonly<{} & {
                query: string;
                language: "kuery" | "lucene";
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
                pattern: string;
                type: "custom";
            }> | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
        } & {
            field: string;
            operation: "percentile";
            percentile: number;
        }> | Readonly<{
            filter?: Readonly<{} & {
                query: string;
                language: "kuery" | "lucene";
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
                pattern: string;
                type: "custom";
            }> | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
        } & {
            field: string;
            operation: "percentile_rank";
            rank: number;
        }>;
    }> | Readonly<{
        width?: number | undefined;
        color?: Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            palette: string;
            range: "absolute" | "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{
            unassignedColor?: Readonly<{
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
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            sort?: "desc" | "asc" | undefined;
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
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
            }>[] | undefined;
            unassignedColor?: Readonly<{
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
        }> | undefined;
        filter?: Readonly<{} & {
            query: string;
            language: "kuery" | "lucene";
        }> | undefined;
        label?: string | undefined;
        summary?: Readonly<{
            label?: string | undefined;
        } & {
            type: "max" | "min" | "count" | "avg" | "sum";
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            pattern: string;
            type: "custom";
        }> | undefined;
        visible?: boolean | undefined;
        alignment?: "left" | "right" | "center" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        apply_color_to?: "background" | "value" | undefined;
    } & {
        operation: "moving_average";
        window: number;
        of: Readonly<{
            field?: string | undefined;
            filter?: Readonly<{} & {
                query: string;
                language: "kuery" | "lucene";
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
                pattern: string;
                type: "custom";
            }> | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
        } & {
            operation: "count";
            empty_as_null: boolean;
        }> | Readonly<{
            filter?: Readonly<{} & {
                query: string;
                language: "kuery" | "lucene";
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
                pattern: string;
                type: "custom";
            }> | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
        } & {
            field: string;
            operation: "unique_count";
            empty_as_null: boolean;
        }> | Readonly<{
            filter?: Readonly<{} & {
                query: string;
                language: "kuery" | "lucene";
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
                pattern: string;
                type: "custom";
            }> | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
        } & {
            field: string;
            operation: "max" | "min" | "median" | "average" | "standard_deviation";
        }> | Readonly<{
            filter?: Readonly<{} & {
                query: string;
                language: "kuery" | "lucene";
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
                pattern: string;
                type: "custom";
            }> | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
        } & {
            field: string;
            operation: "sum";
            empty_as_null: boolean;
        }> | Readonly<{
            filter?: Readonly<{} & {
                query: string;
                language: "kuery" | "lucene";
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
                pattern: string;
                type: "custom";
            }> | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
        } & {
            field: string;
            operation: "last_value";
            sort_by: string;
            show_array_values: boolean;
        }> | Readonly<{
            filter?: Readonly<{} & {
                query: string;
                language: "kuery" | "lucene";
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
                pattern: string;
                type: "custom";
            }> | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
        } & {
            field: string;
            operation: "percentile";
            percentile: number;
        }> | Readonly<{
            filter?: Readonly<{} & {
                query: string;
                language: "kuery" | "lucene";
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
                pattern: string;
                type: "custom";
            }> | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
        } & {
            field: string;
            operation: "percentile_rank";
            rank: number;
        }>;
    }> | Readonly<{
        width?: number | undefined;
        color?: Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            palette: string;
            range: "absolute" | "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{
            unassignedColor?: Readonly<{
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
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            sort?: "desc" | "asc" | undefined;
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
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
            }>[] | undefined;
            unassignedColor?: Readonly<{
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
        }> | undefined;
        filter?: Readonly<{} & {
            query: string;
            language: "kuery" | "lucene";
        }> | undefined;
        label?: string | undefined;
        summary?: Readonly<{
            label?: string | undefined;
        } & {
            type: "max" | "min" | "count" | "avg" | "sum";
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            pattern: string;
            type: "custom";
        }> | undefined;
        visible?: boolean | undefined;
        alignment?: "left" | "right" | "center" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        apply_color_to?: "background" | "value" | undefined;
    } & {
        field: string;
        operation: "cumulative_sum";
    }> | Readonly<{
        width?: number | undefined;
        color?: Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            palette: string;
            range: "absolute" | "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{
            unassignedColor?: Readonly<{
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
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            sort?: "desc" | "asc" | undefined;
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
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
            }>[] | undefined;
            unassignedColor?: Readonly<{
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
        }> | undefined;
        filter?: Readonly<{} & {
            query: string;
            language: "kuery" | "lucene";
        }> | undefined;
        label?: string | undefined;
        summary?: Readonly<{
            label?: string | undefined;
        } & {
            type: "max" | "min" | "count" | "avg" | "sum";
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            pattern: string;
            type: "custom";
        }> | undefined;
        visible?: boolean | undefined;
        alignment?: "left" | "right" | "center" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        apply_color_to?: "background" | "value" | undefined;
    } & {
        field: string;
        operation: "counter_rate";
    }> | Readonly<{
        width?: number | undefined;
        color?: Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            palette: string;
            range: "absolute" | "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{
            unassignedColor?: Readonly<{
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
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            sort?: "desc" | "asc" | undefined;
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
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
            }>[] | undefined;
            unassignedColor?: Readonly<{
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
        }> | undefined;
        filter?: Readonly<{} & {
            query: string;
            language: "kuery" | "lucene";
        }> | undefined;
        label?: string | undefined;
        summary?: Readonly<{
            label?: string | undefined;
        } & {
            type: "max" | "min" | "count" | "avg" | "sum";
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            pattern: string;
            type: "custom";
        }> | undefined;
        visible?: boolean | undefined;
        alignment?: "left" | "right" | "center" | undefined;
        reduced_time_range?: string | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        apply_color_to?: "background" | "value" | undefined;
    } & {
        operation: "formula";
        formula: string;
    }>)[];
    sampling: number;
    ignore_global_filters: boolean;
}> | Readonly<{
    title?: string | undefined;
    description?: string | undefined;
    rows?: Readonly<{
        width?: number | undefined;
        color?: Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            palette: string;
            range: "absolute" | "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{
            unassignedColor?: Readonly<{
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
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            sort?: "desc" | "asc" | undefined;
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
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
            }>[] | undefined;
            unassignedColor?: Readonly<{
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
        }> | undefined;
        visible?: boolean | undefined;
        alignment?: "left" | "right" | "center" | undefined;
        apply_color_to?: "background" | "value" | undefined;
        collapse_by?: "max" | "min" | "avg" | "sum" | undefined;
        click_filter?: boolean | undefined;
    } & {
        operation: "value";
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
    }, "group" | "type"> & {
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
        type: import("@kbn/config-schema").Type<"group">;
    }) | (Omit<{
        disabled: import("@kbn/config-schema").Type<boolean | undefined>;
        negate: import("@kbn/config-schema").Type<boolean | undefined>;
        controlled_by: import("@kbn/config-schema").Type<string | undefined>;
        data_view_id: import("@kbn/config-schema").Type<string | undefined>;
        label: import("@kbn/config-schema").Type<string | undefined>;
        is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
    }, "field" | "type" | "params" | "dsl"> & {
        field: import("@kbn/config-schema").Type<string | undefined>;
        type: import("@kbn/config-schema").Type<"dsl">;
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
        width?: number | undefined;
        color?: Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            palette: string;
            range: "absolute" | "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{
            unassignedColor?: Readonly<{
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
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            sort?: "desc" | "asc" | undefined;
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
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
            }>[] | undefined;
            unassignedColor?: Readonly<{
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
        }> | undefined;
        label?: string | undefined;
        summary?: Readonly<{
            label?: string | undefined;
        } & {
            type: "max" | "min" | "count" | "avg" | "sum";
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            pattern: string;
            type: "custom";
        }> | undefined;
        visible?: boolean | undefined;
        alignment?: "left" | "right" | "center" | undefined;
        apply_color_to?: "background" | "value" | undefined;
    } & {
        operation: "value";
        column: string;
    }>[] | undefined;
    density?: Readonly<{
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
        mode?: "default" | "expanded" | "compact" | undefined;
    } & {}> | undefined;
    sort_by?: Readonly<{} & {
        direction: "desc" | "asc";
        index: number;
        column_type: "row" | "metric";
    }> | Readonly<{} & {
        values: string[];
        direction: "desc" | "asc";
        index: number;
        column_type: "pivoted_metric";
    }> | undefined;
    split_metrics_by?: Readonly<{} & {
        operation: "value";
        column: string;
    }>[] | undefined;
    paging?: 100 | 10 | 50 | 20 | 30 | undefined;
    show_row_numbers?: boolean | undefined;
} & {
    type: "data_table";
    dataset: Readonly<{} & {
        type: "esql";
        query: string;
    }> | Readonly<{
        table?: any;
    } & {
        type: "table";
    }>;
    sampling: number;
    ignore_global_filters: boolean;
}>>;
export type DatatableState = TypeOf<typeof datatableStateSchema>;
export type DatatableStateNoESQL = TypeOf<typeof datatableStateSchemaNoESQL>;
export type DatatableStateESQL = TypeOf<typeof datatableStateSchemaESQL>;
