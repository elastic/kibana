import type { SavedObjectCommon, FinderAttributes } from '@kbn/saved-objects-finder-plugin/common';
export interface SavedSearchesAttributes extends FinderAttributes {
    isTextBasedQuery: boolean;
    usesAdHocDataView?: boolean;
}
export declare const showSavedObject: (savedObject: SavedObjectCommon) => boolean;
