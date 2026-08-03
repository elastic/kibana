import type { DatatableVisualizationState } from '@kbn/lens-common';
import type { DatatableConfig } from '../../../../schema';
export declare function buildStylingState(config: DatatableConfig): Pick<DatatableVisualizationState, 'headerRowHeight' | 'headerRowHeightLines' | 'rowHeight' | 'rowHeightLines' | 'density' | 'paging' | 'sorting' | 'showRowNumbers'>;
