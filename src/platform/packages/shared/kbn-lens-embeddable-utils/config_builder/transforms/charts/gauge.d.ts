import type { TypedLensSerializedState } from '@kbn/lens-common';
import type { GaugeConfig, LensApiConfig } from '../../schema';
import type { LensAttributes } from '../../types';
type GaugeAttributes = Extract<TypedLensSerializedState['attributes'], {
    visualizationType: 'lnsGauge';
}>;
type GaugeAttributesWithoutFiltersAndQuery = Omit<GaugeAttributes, 'state'> & {
    state: Omit<GaugeAttributes['state'], 'filters' | 'query'>;
};
export declare function fromAPItoLensState(config: GaugeConfig): GaugeAttributesWithoutFiltersAndQuery;
export declare function fromLensStateToAPI(config: LensAttributes): Extract<LensApiConfig, {
    type: 'gauge';
}>;
export {};
