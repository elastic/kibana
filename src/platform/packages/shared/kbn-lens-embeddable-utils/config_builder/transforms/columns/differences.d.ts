import type { DerivativeIndexPatternColumn } from '@kbn/lens-common';
import type { LensApiDifferencesOperation, LensApiFieldMetricOperations } from '../../schema/metric_ops';
export declare function fromDifferencesAPItoLensState(options: LensApiDifferencesOperation): DerivativeIndexPatternColumn;
export declare function fromDifferencesLensStateToAPI(column: DerivativeIndexPatternColumn, ref: LensApiFieldMetricOperations): LensApiDifferencesOperation;
