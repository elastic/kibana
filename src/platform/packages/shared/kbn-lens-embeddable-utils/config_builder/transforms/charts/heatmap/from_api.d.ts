import type { TypedLensSerializedState } from '@kbn/lens-common';
import type { HeatmapConfig } from '../../../schema';
type HeatmapAttributes = Extract<TypedLensSerializedState['attributes'], {
    visualizationType: 'lnsHeatmap';
}>;
type HeatmapAttributesWithoutFiltersAndQuery = Omit<HeatmapAttributes, 'state'> & {
    state: Omit<HeatmapAttributes['state'], 'filters' | 'query'>;
};
export declare function fromAPItoLensState(config: HeatmapConfig): HeatmapAttributesWithoutFiltersAndQuery;
export {};
