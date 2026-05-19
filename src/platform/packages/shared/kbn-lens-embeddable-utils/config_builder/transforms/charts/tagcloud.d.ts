import type { TypedLensSerializedState } from '@kbn/lens-common';
import type { LensApiConfig, TagcloudConfig } from '../../schema';
import type { LensAttributes } from '../../types';
type TagcloudAttributes = Extract<TypedLensSerializedState['attributes'], {
    visualizationType: 'lnsTagcloud';
}>;
type TagcloudAttributesWithoutFiltersAndQuery = Omit<TagcloudAttributes, 'state'> & {
    state: Omit<TagcloudAttributes['state'], 'filters' | 'query'>;
};
export declare function fromAPItoLensState(config: TagcloudConfig): TagcloudAttributesWithoutFiltersAndQuery;
export declare function fromLensStateToAPI(config: LensAttributes): Extract<LensApiConfig, {
    type: 'tag_cloud';
}>;
export {};
