import type { TypedLensSerializedState } from '@kbn/lens-common';
import type { LensApiConfig, RegionMapConfig } from '../../schema';
import type { LensAttributes } from '../../types';
type RegionMapAttributes = Extract<TypedLensSerializedState['attributes'], {
    visualizationType: 'lnsChoropleth';
}>;
type RegionMapAttributesWithoutFiltersAndQuery = Omit<RegionMapAttributes, 'state'> & {
    state: Omit<RegionMapAttributes['state'], 'filters' | 'query'>;
};
export declare function fromAPItoLensState(config: RegionMapConfig): RegionMapAttributesWithoutFiltersAndQuery;
export declare function fromLensStateToAPI(config: LensAttributes): Extract<LensApiConfig, {
    type: 'region_map';
}>;
export {};
