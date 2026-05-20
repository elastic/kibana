import type { PersistedIndexPatternLayer, FormulaPublicApi } from '@kbn/lens-common';
export type LensFormula = Parameters<FormulaPublicApi['insertOrReplaceFormulaColumn']>[1];
export type StaticValueConfig = Omit<LensFormula, 'formula'> & {
    color?: string;
    value: string;
};
export declare function getStaticColumn(id: string, baseLayer: PersistedIndexPatternLayer, config: StaticValueConfig): PersistedIndexPatternLayer;
