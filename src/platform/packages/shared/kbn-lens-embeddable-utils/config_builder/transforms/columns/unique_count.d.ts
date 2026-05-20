import type { CardinalityIndexPatternColumn } from '@kbn/lens-common';
import type { LensApiUniqueCountMetricOperation } from '../../schema/metric_ops';
export declare const fromUniqueCountAPItoLensState: (options: LensApiUniqueCountMetricOperation) => CardinalityIndexPatternColumn;
export declare const fromUniqueCountLensStateToAPI: (options: CardinalityIndexPatternColumn) => LensApiUniqueCountMetricOperation;
