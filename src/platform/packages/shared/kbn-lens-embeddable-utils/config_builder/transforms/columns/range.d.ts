import type { RangeIndexPatternColumn } from '@kbn/lens-common';
import type { LensApiRangeOperation, LensApiHistogramOperation } from '../../schema/bucket_ops';
export declare function fromRangeOrHistogramLensApiToLensState(options: LensApiRangeOperation | LensApiHistogramOperation): RangeIndexPatternColumn;
export declare function fromRangeOrHistogramLensStateToAPI(column: RangeIndexPatternColumn): LensApiRangeOperation | LensApiHistogramOperation;
