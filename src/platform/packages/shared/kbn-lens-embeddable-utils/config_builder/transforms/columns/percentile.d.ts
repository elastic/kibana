import type { PercentileIndexPatternColumn } from '@kbn/lens-common';
import type { LensApiPercentileOperation } from '../../schema/metric_ops';
export declare const fromPercentileAPItoLensState: (options: LensApiPercentileOperation) => PercentileIndexPatternColumn;
export declare const fromPercentileLensStateToAPI: (options: PercentileIndexPatternColumn) => LensApiPercentileOperation;
