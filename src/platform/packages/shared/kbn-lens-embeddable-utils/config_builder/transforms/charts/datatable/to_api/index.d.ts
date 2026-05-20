import type { FormBasedLayer, DatatableVisualizationState, TextBasedLayer } from '@kbn/lens-common';
import type { SavedObjectReference } from '@kbn/core/server';
import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import type { DatatableConfig } from '../../../../schema';
export declare function buildVisualizationAPI(visualization: DatatableVisualizationState, layer: Omit<FormBasedLayer, 'indexPatternId'> | TextBasedLayer, layerId: string, adHocDataViews: Record<string, DataViewSpec>, references: SavedObjectReference[], adhocReferences?: SavedObjectReference[]): DatatableConfig;
