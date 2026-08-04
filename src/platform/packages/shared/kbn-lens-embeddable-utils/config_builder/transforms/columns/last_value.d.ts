import type { DataType, LastValueIndexPatternColumn } from '@kbn/lens-common';
import type { LensApiLastValueOperation } from '../../schema/metric_ops';
export declare const fromLastValueAPItoLensState: (options: LensApiLastValueOperation, dataType?: DataType) => LastValueIndexPatternColumn;
export declare const fromLastValueLensStateToAPI: (options: LastValueIndexPatternColumn) => LensApiLastValueOperation;
