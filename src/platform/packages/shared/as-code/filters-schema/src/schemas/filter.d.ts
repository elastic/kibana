/**
 * Validation Schemas for As Code Filter Interface
 *
 * These schemas are used for server validation of API requests and responses
 * in * as Code APIs.
 */
import { type TypeOf } from '@kbn/config-schema';
import { ASCODE_GROUPED_CONDITION_TYPE } from '@kbn/as-code-filters-constants';
/**
 * Discriminated union schema for filter conditions
 */
declare const conditionSchema: import("@kbn/config-schema").Type<import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
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
export interface AsCodeGroupFilterRecursive {
    operator: typeof ASCODE_GROUPED_CONDITION_TYPE.AND | typeof ASCODE_GROUPED_CONDITION_TYPE.OR;
    conditions: Array<TypeOf<typeof conditionSchema> | AsCodeGroupFilterRecursive>;
}
/**
 * Discriminated union schema combining all condition filter types
 */
export declare const asCodeConditionFilterSchema: import("@kbn/config-schema").ObjectType<Omit<{
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
}>;
export declare const asCodeGroupFilterSchema: import("@kbn/config-schema").ObjectType<Omit<{
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
        })> | AsCodeGroupFilterRecursive)[]>;
    }>;
}>;
/**
 * Schema for DSL filters
 * Includes field and params properties specific to DSL filters for preserving metadata
 */
export declare const asCodeDSLFilterSchema: import("@kbn/config-schema").ObjectType<Omit<{
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
}>;
/**
 * Schema for spatial filters
 * Similar to DSL filters but with type='spatial' to preserve spatial_filter meta.type
 */
export declare const asCodeSpatialFilterSchema: import("@kbn/config-schema").ObjectType<Omit<{
    disabled: import("@kbn/config-schema").Type<boolean | undefined>;
    negate: import("@kbn/config-schema").Type<boolean | undefined>;
    controlled_by: import("@kbn/config-schema").Type<string | undefined>;
    data_view_id: import("@kbn/config-schema").Type<string | undefined>;
    label: import("@kbn/config-schema").Type<string | undefined>;
    is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
}, "type" | "dsl"> & {
    type: import("@kbn/config-schema").Type<"spatial">;
    dsl: import("@kbn/config-schema").Type<Record<string, any>>;
}>;
/**
 * Main discriminated union schema for Filter
 * Uses 'type' as discriminator to validate condition, group, dsl, or spatial filters
 */
export declare const asCodeFilterSchema: import("@kbn/config-schema").Type<import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
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
        })> | AsCodeGroupFilterRecursive)[]>;
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
})>>;
export {};
