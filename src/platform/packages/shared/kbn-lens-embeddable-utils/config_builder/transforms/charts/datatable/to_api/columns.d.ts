import type { FormBasedLayer, DatatableVisualizationState, TextBasedLayer, ColumnState } from '@kbn/lens-common';
import type { DatatableConfig, DatatableConfigESQL, DatatableConfigNoESQL } from '../../../../schema';
/**
 * Build the color props for a metric column or an esql row.
 * - If colorMapping is present → output colorMapping
 * - If palette is present → output colorByValue
 */
export declare function buildColorProps(column: ColumnState): Partial<Pick<NonNullable<DatatableConfig['metrics']>[number], 'apply_color_to' | 'color'>>;
type DatatableColumnsNoESQLAndMapping = Pick<DatatableConfigNoESQL, 'metrics' | 'rows' | 'split_metrics_by'> & {
    columnIdMapping: ColumnIdMapping;
};
type DatatableColumnsESQLAndMapping = Pick<DatatableConfigESQL, 'metrics' | 'rows' | 'split_metrics_by'> & {
    columnIdMapping: ColumnIdMapping;
};
export interface ColumnIdMappingValue {
    type: 'metric' | 'row' | 'split_metrics_by';
    index: number;
}
/**
 * Maps old column IDs to their new type and index in the API format.
 * Used to translate sorting column references during transformation.
 */
export type ColumnIdMapping = Map<string, ColumnIdMappingValue>;
export declare function convertDatatableColumnsToAPI(layer: Omit<FormBasedLayer, 'indexPatternId'>, visualization: DatatableVisualizationState): DatatableColumnsNoESQLAndMapping;
export declare function convertDatatableColumnsToAPI(layer: TextBasedLayer, visualization: DatatableVisualizationState): DatatableColumnsESQLAndMapping;
export {};
