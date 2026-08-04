import type { SavedObjectReference } from '@kbn/core/server';
import type { DiscoverSessionAttributes } from '@kbn/saved-search-plugin/server';
import type { DiscoverSessionApiData } from '../schema';
export declare const transformDiscoverSessionIn: (data: DiscoverSessionApiData) => {
    attributes: DiscoverSessionAttributes;
    references: SavedObjectReference[];
};
