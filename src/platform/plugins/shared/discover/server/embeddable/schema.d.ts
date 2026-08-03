import type { ObjectType, TypeOf } from '@kbn/config-schema';
import { DataGridDensity } from '@kbn/discover-utils';
import { VIEW_MODE } from '@kbn/saved-search-plugin/common';
import type { GetDrilldownsSchemaFnType } from '@kbn/embeddable-plugin/server';
export declare const viewModeSchema: import("@kbn/config-schema").Type<VIEW_MODE>;
export declare const dataTableLimitsSchema: ObjectType<{
    rows_per_page: import("@kbn/config-schema").Type<number | undefined>;
    sample_size: import("@kbn/config-schema").Type<number | undefined>;
}>;
export declare const dataTableSchema: ObjectType<{
    column_order: import("@kbn/config-schema").Type<string[] | undefined>;
    column_settings: import("@kbn/config-schema").Type<Record<string, Readonly<{
        width?: number | undefined;
    } & {}>> | undefined>;
    sort: import("@kbn/config-schema").Type<Readonly<{} & {
        direction: "asc" | "desc";
        name: string;
    }>[]>;
    density: import("@kbn/config-schema").Type<DataGridDensity | undefined>;
    header_row_height: import("@kbn/config-schema").Type<number | "auto" | undefined>;
    row_height: import("@kbn/config-schema").Type<number | "auto" | undefined>;
}>;
export declare const panelOverridesSchema: ObjectType<{
    column_order: import("@kbn/config-schema").Type<string[] | undefined>;
    column_settings: import("@kbn/config-schema").Type<Record<string, Readonly<{
        width?: number | undefined;
    } & {}>> | undefined>;
    sort: import("@kbn/config-schema").Type<Readonly<{} & {
        direction: "asc" | "desc";
        name: string;
    }>[] | undefined>;
    density: import("@kbn/config-schema").Type<DataGridDensity | undefined>;
    header_row_height: import("@kbn/config-schema").Type<number | "auto" | undefined>;
    row_height: import("@kbn/config-schema").Type<number | "auto" | undefined>;
    rows_per_page: import("@kbn/config-schema").Type<number | undefined>;
    sample_size: import("@kbn/config-schema").Type<number | undefined>;
}>;
export declare const classicTabSchema: ObjectType<{
    query: import("@kbn/config-schema").Type<Readonly<{} & {
        language: "lucene" | "kql";
        expression: string;
    }> | undefined>;
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
            value: ObjectType<{
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
        group: ObjectType<{
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
                value: ObjectType<{
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
    })>[]>;
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
    view_mode: import("@kbn/config-schema").Type<VIEW_MODE>;
    rows_per_page: import("@kbn/config-schema").Type<number | undefined>;
    sample_size: import("@kbn/config-schema").Type<number | undefined>;
    column_order: import("@kbn/config-schema").Type<string[] | undefined>;
    column_settings: import("@kbn/config-schema").Type<Record<string, Readonly<{
        width?: number | undefined;
    } & {}>> | undefined>;
    sort: import("@kbn/config-schema").Type<Readonly<{} & {
        direction: "asc" | "desc";
        name: string;
    }>[]>;
    density: import("@kbn/config-schema").Type<DataGridDensity | undefined>;
    header_row_height: import("@kbn/config-schema").Type<number | "auto" | undefined>;
    row_height: import("@kbn/config-schema").Type<number | "auto" | undefined>;
}>;
export declare const esqlTabSchema: ObjectType<{
    data_source: ObjectType<{
        type: import("@kbn/config-schema").Type<"esql">;
        query: import("@kbn/config-schema").Type<string>;
    }>;
    rows_per_page: import("@kbn/config-schema").Type<number | undefined>;
    sample_size: import("@kbn/config-schema").Type<number | undefined>;
    column_order: import("@kbn/config-schema").Type<string[] | undefined>;
    column_settings: import("@kbn/config-schema").Type<Record<string, Readonly<{
        width?: number | undefined;
    } & {}>> | undefined>;
    sort: import("@kbn/config-schema").Type<Readonly<{} & {
        direction: "asc" | "desc";
        name: string;
    }>[]>;
    density: import("@kbn/config-schema").Type<DataGridDensity | undefined>;
    header_row_height: import("@kbn/config-schema").Type<number | "auto" | undefined>;
    row_height: import("@kbn/config-schema").Type<number | "auto" | undefined>;
}>;
export declare const tabSchema: import("@kbn/config-schema").Type<Readonly<{
    density?: DataGridDensity | undefined;
    rows_per_page?: number | undefined;
    sample_size?: number | undefined;
    column_order?: string[] | undefined;
    column_settings?: Record<string, Readonly<{
        width?: number | undefined;
    } & {}>> | undefined;
    header_row_height?: number | "auto" | undefined;
    row_height?: number | "auto" | undefined;
} & {
    sort: Readonly<{} & {
        direction: "asc" | "desc";
        name: string;
    }>[];
    data_source: Readonly<{} & {
        type: "esql";
        query: string;
    }>;
}> | Readonly<{
    query?: Readonly<{} & {
        language: "lucene" | "kql";
        expression: string;
    }> | undefined;
    density?: DataGridDensity | undefined;
    rows_per_page?: number | undefined;
    sample_size?: number | undefined;
    column_order?: string[] | undefined;
    column_settings?: Record<string, Readonly<{
        width?: number | undefined;
    } & {}>> | undefined;
    header_row_height?: number | "auto" | undefined;
    row_height?: number | "auto" | undefined;
} & {
    sort: Readonly<{} & {
        direction: "asc" | "desc";
        name: string;
    }>[];
    filters: import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
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
            value: ObjectType<{
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
        group: ObjectType<{
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
                value: ObjectType<{
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
    })>[];
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
    view_mode: VIEW_MODE;
}>>;
declare const discoverSessionByValuePropsSchema: ObjectType<{
    tabs: import("@kbn/config-schema").Type<(Readonly<{
        density?: DataGridDensity | undefined;
        rows_per_page?: number | undefined;
        sample_size?: number | undefined;
        column_order?: string[] | undefined;
        column_settings?: Record<string, Readonly<{
            width?: number | undefined;
        } & {}>> | undefined;
        header_row_height?: number | "auto" | undefined;
        row_height?: number | "auto" | undefined;
    } & {
        sort: Readonly<{} & {
            direction: "asc" | "desc";
            name: string;
        }>[];
        data_source: Readonly<{} & {
            type: "esql";
            query: string;
        }>;
    }> | Readonly<{
        query?: Readonly<{} & {
            language: "lucene" | "kql";
            expression: string;
        }> | undefined;
        density?: DataGridDensity | undefined;
        rows_per_page?: number | undefined;
        sample_size?: number | undefined;
        column_order?: string[] | undefined;
        column_settings?: Record<string, Readonly<{
            width?: number | undefined;
        } & {}>> | undefined;
        header_row_height?: number | "auto" | undefined;
        row_height?: number | "auto" | undefined;
    } & {
        sort: Readonly<{} & {
            direction: "asc" | "desc";
            name: string;
        }>[];
        filters: import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
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
                value: ObjectType<{
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
            group: ObjectType<{
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
                    value: ObjectType<{
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
        })>[];
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
        view_mode: VIEW_MODE;
    }>)[]>;
}>;
declare const getDiscoverSessionByValueEmbeddableSchema: (getDrilldownsSchema: GetDrilldownsSchemaFnType) => import("@kbn/config-schema").Type<Readonly<{
    description?: string | undefined;
    title?: string | undefined;
    time_range?: Readonly<{
        mode?: "absolute" | "relative" | undefined;
    } & {
        from: string;
        to: string;
    }> | undefined;
    hide_title?: boolean | undefined;
    hide_border?: boolean | undefined;
    drilldowns?: import("@kbn/embeddable-plugin/server").DrilldownState[] | undefined;
} & {
    tabs: (Readonly<{
        density?: DataGridDensity | undefined;
        rows_per_page?: number | undefined;
        sample_size?: number | undefined;
        column_order?: string[] | undefined;
        column_settings?: Record<string, Readonly<{
            width?: number | undefined;
        } & {}>> | undefined;
        header_row_height?: number | "auto" | undefined;
        row_height?: number | "auto" | undefined;
    } & {
        sort: Readonly<{} & {
            direction: "asc" | "desc";
            name: string;
        }>[];
        data_source: Readonly<{} & {
            type: "esql";
            query: string;
        }>;
    }> | Readonly<{
        query?: Readonly<{} & {
            language: "lucene" | "kql";
            expression: string;
        }> | undefined;
        density?: DataGridDensity | undefined;
        rows_per_page?: number | undefined;
        sample_size?: number | undefined;
        column_order?: string[] | undefined;
        column_settings?: Record<string, Readonly<{
            width?: number | undefined;
        } & {}>> | undefined;
        header_row_height?: number | "auto" | undefined;
        row_height?: number | "auto" | undefined;
    } & {
        sort: Readonly<{} & {
            direction: "asc" | "desc";
            name: string;
        }>[];
        filters: import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
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
                value: ObjectType<{
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
            group: ObjectType<{
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
                    value: ObjectType<{
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
        })>[];
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
        view_mode: VIEW_MODE;
    }>)[];
}>>;
declare const discoverSessionByReferencePropsSchema: ObjectType<{
    ref_id: import("@kbn/config-schema").Type<string>;
    selected_tab_id: import("@kbn/config-schema").Type<string | undefined>;
    overrides: ObjectType<{
        column_order: import("@kbn/config-schema").Type<string[] | undefined>;
        column_settings: import("@kbn/config-schema").Type<Record<string, Readonly<{
            width?: number | undefined;
        } & {}>> | undefined>;
        sort: import("@kbn/config-schema").Type<Readonly<{} & {
            direction: "asc" | "desc";
            name: string;
        }>[] | undefined>;
        density: import("@kbn/config-schema").Type<DataGridDensity | undefined>;
        header_row_height: import("@kbn/config-schema").Type<number | "auto" | undefined>;
        row_height: import("@kbn/config-schema").Type<number | "auto" | undefined>;
        rows_per_page: import("@kbn/config-schema").Type<number | undefined>;
        sample_size: import("@kbn/config-schema").Type<number | undefined>;
    }>;
}>;
declare const getDiscoverSessionByReferenceEmbeddableSchema: (getDrilldownsSchema: GetDrilldownsSchemaFnType) => import("@kbn/config-schema").Type<Readonly<{
    description?: string | undefined;
    title?: string | undefined;
    time_range?: Readonly<{
        mode?: "absolute" | "relative" | undefined;
    } & {
        from: string;
        to: string;
    }> | undefined;
    hide_title?: boolean | undefined;
    hide_border?: boolean | undefined;
    drilldowns?: import("@kbn/embeddable-plugin/server").DrilldownState[] | undefined;
    selected_tab_id?: string | undefined;
} & {
    overrides: Readonly<{
        sort?: Readonly<{} & {
            direction: "asc" | "desc";
            name: string;
        }>[] | undefined;
        density?: DataGridDensity | undefined;
        rows_per_page?: number | undefined;
        sample_size?: number | undefined;
        column_order?: string[] | undefined;
        column_settings?: Record<string, Readonly<{
            width?: number | undefined;
        } & {}>> | undefined;
        header_row_height?: number | "auto" | undefined;
        row_height?: number | "auto" | undefined;
    } & {}>;
    ref_id: string;
}>>;
export declare const getDiscoverSessionEmbeddableSchema: (getDrilldownsSchema: GetDrilldownsSchemaFnType) => import("@kbn/config-schema").Type<Readonly<{
    description?: string | undefined;
    title?: string | undefined;
    time_range?: Readonly<{
        mode?: "absolute" | "relative" | undefined;
    } & {
        from: string;
        to: string;
    }> | undefined;
    hide_title?: boolean | undefined;
    hide_border?: boolean | undefined;
    drilldowns?: import("@kbn/embeddable-plugin/server").DrilldownState[] | undefined;
} & {
    tabs: (Readonly<{
        density?: DataGridDensity | undefined;
        rows_per_page?: number | undefined;
        sample_size?: number | undefined;
        column_order?: string[] | undefined;
        column_settings?: Record<string, Readonly<{
            width?: number | undefined;
        } & {}>> | undefined;
        header_row_height?: number | "auto" | undefined;
        row_height?: number | "auto" | undefined;
    } & {
        sort: Readonly<{} & {
            direction: "asc" | "desc";
            name: string;
        }>[];
        data_source: Readonly<{} & {
            type: "esql";
            query: string;
        }>;
    }> | Readonly<{
        query?: Readonly<{} & {
            language: "lucene" | "kql";
            expression: string;
        }> | undefined;
        density?: DataGridDensity | undefined;
        rows_per_page?: number | undefined;
        sample_size?: number | undefined;
        column_order?: string[] | undefined;
        column_settings?: Record<string, Readonly<{
            width?: number | undefined;
        } & {}>> | undefined;
        header_row_height?: number | "auto" | undefined;
        row_height?: number | "auto" | undefined;
    } & {
        sort: Readonly<{} & {
            direction: "asc" | "desc";
            name: string;
        }>[];
        filters: import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
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
                value: ObjectType<{
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
            group: ObjectType<{
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
                    value: ObjectType<{
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
        })>[];
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
        view_mode: VIEW_MODE;
    }>)[];
}> | Readonly<{
    description?: string | undefined;
    title?: string | undefined;
    time_range?: Readonly<{
        mode?: "absolute" | "relative" | undefined;
    } & {
        from: string;
        to: string;
    }> | undefined;
    hide_title?: boolean | undefined;
    hide_border?: boolean | undefined;
    drilldowns?: import("@kbn/embeddable-plugin/server").DrilldownState[] | undefined;
    selected_tab_id?: string | undefined;
} & {
    overrides: Readonly<{
        sort?: Readonly<{} & {
            direction: "asc" | "desc";
            name: string;
        }>[] | undefined;
        density?: DataGridDensity | undefined;
        rows_per_page?: number | undefined;
        sample_size?: number | undefined;
        column_order?: string[] | undefined;
        column_settings?: Record<string, Readonly<{
            width?: number | undefined;
        } & {}>> | undefined;
        header_row_height?: number | "auto" | undefined;
        row_height?: number | "auto" | undefined;
    } & {}>;
    ref_id: string;
}>>;
export type DiscoverSessionPanelOverrides = TypeOf<typeof panelOverridesSchema>;
export type DiscoverSessionClassicTab = TypeOf<typeof classicTabSchema>;
export type DiscoverSessionEsqlTab = TypeOf<typeof esqlTabSchema>;
export type DiscoverSessionTab = TypeOf<typeof tabSchema>;
export type DiscoverSessionEmbeddableByValueProps = TypeOf<typeof discoverSessionByValuePropsSchema>;
export type DiscoverSessionEmbeddableByReferenceProps = TypeOf<typeof discoverSessionByReferencePropsSchema>;
export type DiscoverSessionEmbeddableByValueState = TypeOf<ReturnType<typeof getDiscoverSessionByValueEmbeddableSchema>>;
export type DiscoverSessionEmbeddableByReferenceState = TypeOf<ReturnType<typeof getDiscoverSessionByReferenceEmbeddableSchema>>;
export type DiscoverSessionEmbeddableState = TypeOf<ReturnType<typeof getDiscoverSessionEmbeddableSchema>>;
export {};
