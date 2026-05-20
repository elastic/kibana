import type { LensApiBucketOperations } from '../../schema/bucket_ops';
import type { AnyBucketLensStateColumn, AnyLensStateColumn, AnyMetricLensStateColumn } from './types';
export declare function fromBucketLensApiToLensState(options: LensApiBucketOperations, columns: {
    column: AnyMetricLensStateColumn;
    id: string;
}[]): AnyBucketLensStateColumn;
export declare function fromBucketLensStateToAPI(column: AnyBucketLensStateColumn, columns: {
    column: AnyLensStateColumn;
    id: string;
}[]): LensApiBucketOperations;
