import { type CountIndexPatternColumn } from '@kbn/lens-common';
import type { LensApiCountMetricOperation } from '../../schema/metric_ops';
export type CountColumnParams = CountIndexPatternColumn['params'];
export declare const fromCountAPItoLensState: (options: LensApiCountMetricOperation) => CountIndexPatternColumn;
export declare const fromCountLensStateToAPI: (options: CountIndexPatternColumn) => LensApiCountMetricOperation;
