import type { SavedObjectCommon, FinderAttributes } from '@kbn/saved-objects-finder-plugin/common';
import type { DiscoverSessionAttributes } from '@kbn/saved-search-plugin/server';
type DiscoverFinderAttributes = FinderAttributes & Partial<Pick<DiscoverSessionAttributes, 'tabs'>>;
export declare const showSavedObject: (savedObject: SavedObjectCommon<DiscoverFinderAttributes>) => boolean;
export {};
