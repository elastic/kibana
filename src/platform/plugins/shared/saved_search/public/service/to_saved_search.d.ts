import type { SerializableSavedSearch, SavedSearchByValueAttributes } from '../../common/types';
import type { SavedSearchesServiceDeps } from './saved_searches_service';
import type { SavedSearch } from './types';
export interface SavedSearchUnwrapMetaInfo {
    sharingSavedObjectProps: SavedSearch['sharingSavedObjectProps'];
    managed: boolean | undefined;
}
export interface SavedSearchUnwrapResult {
    attributes: SavedSearchByValueAttributes;
    metaInfo?: SavedSearchUnwrapMetaInfo;
}
export declare const byValueToSavedSearch: <Serialized extends boolean = false, ReturnType = Serialized extends true ? SerializableSavedSearch : SavedSearch>(result: SavedSearchUnwrapResult, services: SavedSearchesServiceDeps, serializable?: Serialized) => Promise<ReturnType>;
