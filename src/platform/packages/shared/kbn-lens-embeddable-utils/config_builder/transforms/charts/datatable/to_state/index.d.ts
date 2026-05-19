import type { DatatableVisualizationState, FormBasedPersistedState } from '@kbn/lens-common';
import type { DatatableConfig, DatatableConfigESQL, DatatableConfigNoESQL } from '../../../../schema';
export declare function buildFormBasedLayer(config: DatatableConfigNoESQL): FormBasedPersistedState['layers'];
export declare function getValueColumns(config: DatatableConfigESQL): import("@kbn/lens-common").TextBasedLayerColumn[];
export declare function buildVisualizationState(config: DatatableConfig): DatatableVisualizationState;
