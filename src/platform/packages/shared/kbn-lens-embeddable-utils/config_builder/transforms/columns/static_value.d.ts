import type { StaticValueIndexPatternColumn } from '@kbn/lens-common';
import type { LensApiStaticValueOperation } from '../../schema/metric_ops';
export declare const fromStaticValueAPItoLensState: (options: LensApiStaticValueOperation) => StaticValueIndexPatternColumn;
export declare const fromStaticValueLensStateToAPI: (options: StaticValueIndexPatternColumn) => LensApiStaticValueOperation;
