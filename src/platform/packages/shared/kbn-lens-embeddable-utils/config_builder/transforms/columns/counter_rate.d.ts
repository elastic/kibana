import type { CounterRateIndexPatternColumn } from '@kbn/lens-common';
import type { LensApiCounterRateOperation, LensApiMetricOperation } from '../../schema/metric_ops';
export declare const fromCounterRateAPItoLensState: (options: LensApiCounterRateOperation) => CounterRateIndexPatternColumn;
export declare const fromCounterRateLensStateToAPI: (options: CounterRateIndexPatternColumn, ref: LensApiMetricOperation) => LensApiCounterRateOperation;
