import type { FormulaIndexPatternColumn } from '../operations';
import type { FormBasedLayer, FormBasedPersistedState } from '../types';
export declare function hasStateFormulaColumn(state: FormBasedPersistedState): boolean;
export declare function getFormulaColumnsFromLayer(layer: Omit<FormBasedLayer, 'indexPatternId'>): [string, FormulaIndexPatternColumn][];
export declare function getReferencedColumnIds(layer: Omit<FormBasedLayer, 'indexPatternId'>, columnId: string): string[];
export declare function cleanupFormulaReferenceColumns(layer: Omit<FormBasedLayer, 'indexPatternId'>): Omit<FormBasedLayer, 'indexPatternId'>;
