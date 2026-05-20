import type { DateHistogramIndexPatternColumn } from '@kbn/lens-common';
import type { LensApiDateHistogramOperation } from '../../schema/bucket_ops';
export declare function fromDateHistogramLensApiToLensState(options: LensApiDateHistogramOperation): DateHistogramIndexPatternColumn;
export declare function fromDateHistogramLensStateToAPI(column: DateHistogramIndexPatternColumn): LensApiDateHistogramOperation;
