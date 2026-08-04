import type { CumulativeSumIndexPatternColumn } from '@kbn/lens-common';
import type { LensApiCountMetricOperation, LensApiCumulativeSumOperation, LensApiSumMetricOperation } from '../../schema/metric_ops';
export declare const fromCumulativeSumAPItoLensState: (options: LensApiCumulativeSumOperation) => CumulativeSumIndexPatternColumn;
export declare const fromCumulativeSumLensStateToAPI: (options: CumulativeSumIndexPatternColumn, ref: LensApiCountMetricOperation | LensApiSumMetricOperation) => LensApiCumulativeSumOperation;
