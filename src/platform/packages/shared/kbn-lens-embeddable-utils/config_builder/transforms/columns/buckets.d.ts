import type { LensApiBucketOperations } from '../../schema/bucket_ops';
import type { AnyBucketLensStateColumn, AnyLensStateColumn, AnyMetricLensStateColumn } from './types';
/**
 * @param columns Visible API metrics only — not internal reference columns (e.g. max for
 * counter_rate). Terms rank_by.metric_index indexes into this array.
 */
export declare function fromBucketLensApiToLensState(options: LensApiBucketOperations, columns: {
    column: AnyMetricLensStateColumn;
    id: string;
}[]): AnyBucketLensStateColumn;
export declare function fromBucketLensStateToAPI(column: AnyBucketLensStateColumn, columns: {
    column: AnyLensStateColumn;
    id: string;
}[]): LensApiBucketOperations;
