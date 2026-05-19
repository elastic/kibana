import { type TypedLensSerializedState } from '@kbn/lens-common';
import type { PartitionConfig } from '../../schema/charts/partition';
import { type LensAttributes } from '../../types';
type PartitionLens = Extract<TypedLensSerializedState['attributes'], {
    visualizationType: 'lnsPie';
}>;
type PartitionLensState = Omit<PartitionLens['state'], 'filters' | 'query'>;
type PartitionLensWithoutQueryAndFilters = Omit<PartitionLens, 'state'> & {
    state: PartitionLensState;
};
export declare function getValueColumns(layer: unknown): import("@kbn/lens-common").TextBasedLayerColumn[];
export declare function fromAPItoLensState(config: PartitionConfig): PartitionLensWithoutQueryAndFilters;
export declare function fromLensStateToAPI(config: LensAttributes): PartitionConfig;
export {};
