import type { AutoColorType, ColorMappingType, StaticColorType } from '../color';
export declare const valueDisplaySchema: import("@kbn/config-schema").Type<Readonly<{
    mode?: "absolute" | "percentage" | undefined;
    visible?: boolean | undefined;
    percent_decimals?: number | undefined;
} & {}> | undefined>;
export declare const legendNestedSchema: import("@kbn/config-schema").Type<boolean | undefined>;
export type PartitionMetric = {} | {
    color?: StaticColorType | AutoColorType;
};
export interface PartitionGroupBy {
    collapse_by?: string;
    color?: ColorMappingType;
}
export declare function validateColoringAssignments({ metrics, group_by, }: {
    metrics: Array<PartitionMetric>;
    group_by?: Array<PartitionGroupBy>;
}): "Coloring can only be assigned to a single grouping dimension." | "Coloring cannot be assigned to a collapsed grouping dimension." | "Coloring can only be assigned to the first non-collapsed grouping dimension." | undefined;
export declare function validateGroupings({ metrics, group_by, }: {
    metrics: Array<PartitionMetric>;
    group_by?: Array<{
        collapse_by?: string;
    }>;
}): "When multiple metrics are defined, only collapsed group_by dimensions are allowed." | "Only a single non-collapsed dimension is allowed for group_by" | undefined;
export declare function validateMultipleMetricsCriteria(arg: {
    metrics: Array<PartitionMetric>;
    group_by?: Array<{
        collapse_by?: string;
    }>;
}): "Coloring can only be assigned to a single grouping dimension." | "Coloring cannot be assigned to a collapsed grouping dimension." | "Coloring can only be assigned to the first non-collapsed grouping dimension." | "When multiple metrics are defined, only collapsed group_by dimensions are allowed." | "Only a single non-collapsed dimension is allowed for group_by" | undefined;
