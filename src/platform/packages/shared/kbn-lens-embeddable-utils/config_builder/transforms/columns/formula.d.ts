import type { FormulaIndexPatternColumn } from '@kbn/lens-common';
import type { LensApiFormulaOperation } from '../../schema/metric_ops';
export declare const fromFormulaAPItoLensState: (options: LensApiFormulaOperation) => FormulaIndexPatternColumn;
export declare const fromFormulaLensStateToAPI: (options: FormulaIndexPatternColumn) => LensApiFormulaOperation;
