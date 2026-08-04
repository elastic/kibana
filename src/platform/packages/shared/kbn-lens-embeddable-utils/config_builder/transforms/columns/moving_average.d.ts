import type { MovingAverageIndexPatternColumn } from '@kbn/lens-common';
import type { LensApiMovingAverageOperation, LensApiFieldMetricOperations } from '../../schema/metric_ops';
export declare function fromMovingAverageAPItoLensState(options: LensApiMovingAverageOperation): MovingAverageIndexPatternColumn;
export declare function fromMovingAverageLensStateToAPI(column: MovingAverageIndexPatternColumn, ref: LensApiFieldMetricOperations): LensApiMovingAverageOperation;
