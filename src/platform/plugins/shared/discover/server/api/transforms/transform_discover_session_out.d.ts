import type { SavedObjectReference } from '@kbn/core/server';
import type { DiscoverSessionAttributes } from '@kbn/saved-search-plugin/server';
import type { DiscoverSessionApiData } from '../schema';
export declare const transformDiscoverSessionOut: (attributes: DiscoverSessionAttributes, references?: SavedObjectReference[]) => DiscoverSessionApiData;
