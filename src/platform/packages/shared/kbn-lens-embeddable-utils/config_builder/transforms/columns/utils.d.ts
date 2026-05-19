import type { DataType, TimeScaleUnit } from '@kbn/lens-common';
import type { Query } from '@kbn/es-query';
import type { LensApiAllMetricOperations, LensApiAllMetricOrFormulaOperations, LensApiReferableMetricOperations } from '../../schema/metric_ops';
import type { AnyBucketLensStateColumn, AnyLensStateColumn, AnyMetricLensStateColumn, ReferableMetricLensStateColumn } from './types';
import type { LensApiAllOperations, LensApiBucketOperations } from '../../schema';
import type { LensApiFilterType } from '../../schema/filter';
export declare const LENS_EMPTY_AS_NULL_DEFAULT_VALUE = false;
export declare function getLensStateMetricSharedProps(options: {
    time_scale?: TimeScaleUnit;
    reduced_time_range?: string;
    time_shift?: string;
    filter?: LensApiFilterType;
    label?: string;
}, dataType?: DataType): {
    label: string;
    customLabel: boolean;
    timeShift?: string | undefined;
    reducedTimeRange?: string | undefined;
    timeScale?: TimeScaleUnit | undefined;
    filter?: Query | undefined;
    dataType: DataType;
    isBucketed: boolean;
};
export declare function getLensAPIMetricSharedProps(options: {
    customLabel?: boolean;
    timeScale?: TimeScaleUnit;
    reducedTimeRange?: string;
    timeShift?: string;
    filter?: Query;
    label?: string;
}): {
    filter?: Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined;
    time_shift?: string | undefined;
    reduced_time_range?: string | undefined;
    time_scale?: TimeScaleUnit | undefined;
    label?: string | undefined;
};
export declare function getLensStateBucketSharedProps(options: {
    label?: string;
    field?: string;
}): {
    sourceField: string;
    label: string;
    customLabel: boolean;
    isBucketed: boolean;
};
export declare function getLensAPIBucketSharedProps(options: {
    label?: string;
    customLabel?: boolean;
    sourceField: string;
}): {
    label?: string | undefined;
    field: string;
};
/**
 * Type guard to test if a given API column is of the specified operation type
 */
export declare function isAPIColumnOfType<C extends LensApiAllOperations>(type: C['operation'], column: LensApiAllOperations): column is C;
declare const referenceTypes: readonly ["moving_average", "cumulative_sum", "differences", "counter_rate"];
export declare function isAPIColumnOfBucketType(column: LensApiAllOperations): column is LensApiBucketOperations;
export declare function isAPIColumnOfMetricType(column: LensApiAllOperations): column is LensApiAllMetricOrFormulaOperations;
export declare function isAPIColumnOfReferenceType(column: LensApiAllOperations): column is Extract<LensApiAllMetricOrFormulaOperations, {
    operation: (typeof referenceTypes)[number];
}>;
export declare function isApiColumnOfReferableType(column: LensApiAllMetricOperations): column is LensApiReferableMetricOperations;
export declare function isLensStateColumnOfType<C extends AnyLensStateColumn>(type: C['operationType'], column: AnyLensStateColumn): column is C;
export declare function isColumnOfReferableType(column: AnyMetricLensStateColumn): column is ReferableMetricLensStateColumn;
export declare function isLensStateBucketColumnType(column: AnyLensStateColumn): column is AnyBucketLensStateColumn;
export {};
