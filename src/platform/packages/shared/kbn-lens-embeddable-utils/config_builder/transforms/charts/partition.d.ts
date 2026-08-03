import type { LensPartitionVisualizationState } from '@kbn/lens-common';
import { type TypedLensSerializedState } from '@kbn/lens-common';
import type { PartitionConfig } from '../../schema/charts/partition';
import { type LensAttributes } from '../../types';
import type { PieConfig } from '../../schema/charts/pie';
type PieStyling = NonNullable<NonNullable<NonNullable<PieConfig['styling']>>>;
type PartitionLens = Extract<TypedLensSerializedState['attributes'], {
    visualizationType: 'lnsPie';
}>;
type PartitionLensState = Omit<PartitionLens['state'], 'filters' | 'query'>;
type PartitionLensWithoutQueryAndFilters = Omit<PartitionLens, 'state'> & {
    state: PartitionLensState;
};
export type AccessorType = 'group_by' | 'metric' | 'group_breakdown_by';
export declare function getAccessorName(type: AccessorType, index: number): string;
export declare function getValueColumns(layer: unknown): import("@kbn/lens-common").TextBasedLayerColumn[];
export declare function fromAPItoLensState(config: PartitionConfig): PartitionLensWithoutQueryAndFilters;
export declare function fromLensStateToAPI(config: LensAttributes): PartitionConfig;
export declare function getGroups(vizLayer: LensPartitionVisualizationState['layers'][0]): string[];
export declare function getMetrics(vizLayer: LensPartitionVisualizationState['layers'][0]): string[];
export declare function getDonutHoleSize(partitionShape: LensPartitionVisualizationState['shape'], donutHoleSize?: number): PieStyling['donut_hole'];
export {};
