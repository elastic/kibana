import type { AvgIndexPatternColumn, MaxIndexPatternColumn, MedianIndexPatternColumn, MinIndexPatternColumn, StandardDeviationIndexPatternColumn, SumIndexPatternColumn } from '@kbn/lens-common';
import type { LensApiMetricOperation, LensApiSumMetricOperation } from '../../schema/metric_ops';
export declare function fromBasicMetricAPItoLensState(options: LensApiMetricOperation): StandardDeviationIndexPatternColumn | MinIndexPatternColumn | MaxIndexPatternColumn | AvgIndexPatternColumn | MedianIndexPatternColumn;
export declare function fromSumMetricAPIToLensState(options: LensApiSumMetricOperation): SumIndexPatternColumn;
export declare function fromBasicMetricLensStateToAPI(options: StandardDeviationIndexPatternColumn | MinIndexPatternColumn | MaxIndexPatternColumn | AvgIndexPatternColumn | MedianIndexPatternColumn): LensApiMetricOperation;
export declare function fromSumMetricLensStateToAPI(options: SumIndexPatternColumn): LensApiSumMetricOperation;
