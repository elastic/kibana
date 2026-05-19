import type { TypeOf } from '@kbn/config-schema';
export declare const labelSharedProp: {
    /**
     * Label for the operation
     */
    label: import("@kbn/config-schema").Type<string | undefined>;
};
export declare const sharedPanelInfoSchema: {
    /**
     * The title of the chart displayed in the panel.
     *
     * Optional. If not provided, the chart will not have a title.
     *
     * Possible values: Any string value, or undefined if omitted.
     */
    title: import("@kbn/config-schema").Type<string | undefined>;
    /**
     * The description of the chart, providing additional context or information.
     *
     * Optional. If not provided, the chart will not have a description.
     *
     * Possible values: Any string value, or undefined if omitted.
     */
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
};
export declare const dslOnlyPanelInfoSchema: {
    query: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
};
export declare const ignoringGlobalFiltersSchemaRaw: {
    /**
     * Whether to ignore global filters when fetching data for this layer.
     *
     * If true, global filters (such as those set in the dashboard or application context) will be ignored for this layer.
     * If false, global filters will be applied.
     *
     * Default: false
     * Possible values: boolean (true or false)
     */
    ignore_global_filters: import("@kbn/config-schema").Type<boolean>;
};
export declare const layerSettingsSchema: {
    /**
     * Whether to ignore global filters when fetching data for this layer.
     *
     * If true, global filters (such as those set in the dashboard or application context) will be ignored for this layer.
     * If false, global filters will be applied.
     *
     * Default: false
     * Possible values: boolean (true or false)
     */
    ignore_global_filters: import("@kbn/config-schema").Type<boolean>;
    /**
     * The sampling factor for the data source.
     *
     * Determines the proportion of the data source to be used. Must be a number between 0 and 1 (inclusive).
     * - 0: No sampling (use none of the data)
     * - 1: Full sampling (use all data)
     * - Any value between 0 and 1: Use that proportion of the data
     *
     * Default: 1
     * Possible values: number (0 <= value <= 1)
     */
    sampling: import("@kbn/config-schema").Type<number>;
};
export declare const collapseBySchema: import("@kbn/config-schema").Type<"min" | "max" | "avg" | "sum">;
export type CollapseBySchema = TypeOf<typeof collapseBySchema>;
declare const layerSettingsSchemaWrapped: import("@kbn/config-schema").ObjectType<{
    /**
     * Whether to ignore global filters when fetching data for this layer.
     *
     * If true, global filters (such as those set in the dashboard or application context) will be ignored for this layer.
     * If false, global filters will be applied.
     *
     * Default: false
     * Possible values: boolean (true or false)
     */
    ignore_global_filters: import("@kbn/config-schema").Type<boolean>;
    /**
     * The sampling factor for the data source.
     *
     * Determines the proportion of the data source to be used. Must be a number between 0 and 1 (inclusive).
     * - 0: No sampling (use none of the data)
     * - 1: Full sampling (use all data)
     * - Any value between 0 and 1: Use that proportion of the data
     *
     * Default: 1
     * Possible values: number (0 <= value <= 1)
     */
    sampling: import("@kbn/config-schema").Type<number>;
}>;
export type LayerSettingsSchema = TypeOf<typeof layerSettingsSchemaWrapped>;
export declare const axisTitleSchemaProps: {
    text: import("@kbn/config-schema").Type<string | undefined>;
    visible: import("@kbn/config-schema").Type<boolean | undefined>;
};
export declare const legendTruncateAfterLinesSchema: import("@kbn/config-schema").Type<number | undefined>;
export {};
