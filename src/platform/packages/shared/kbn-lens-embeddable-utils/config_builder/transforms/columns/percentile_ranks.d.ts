import type { PercentileRanksIndexPatternColumn } from '@kbn/lens-common';
import type { LensApiPercentileRanksOperation } from '../../schema/metric_ops';
export declare const fromPercentileRanksAPItoLensState: (options: LensApiPercentileRanksOperation) => PercentileRanksIndexPatternColumn;
export declare const fromPercentileRankLensStateToAPI: (options: PercentileRanksIndexPatternColumn) => LensApiPercentileRanksOperation;
