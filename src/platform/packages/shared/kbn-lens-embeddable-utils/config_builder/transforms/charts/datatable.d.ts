import type { TypedLensSerializedState } from '@kbn/lens-common';
import type { DatatableConfig } from '../../schema';
import type { LensAttributes } from '../../types';
type DatatableAttributes = Extract<TypedLensSerializedState['attributes'], {
    visualizationType: 'lnsDatatable';
}>;
type DatatableAttributesWithoutFiltersAndQuery = Omit<DatatableAttributes, 'state'> & {
    state: Omit<DatatableAttributes['state'], 'filters' | 'query'>;
};
export declare function fromAPItoLensState(config: DatatableConfig): DatatableAttributesWithoutFiltersAndQuery;
export declare function fromLensStateToAPI(config: LensAttributes): DatatableConfig;
export {};
