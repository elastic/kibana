import type { GetSavedSearchDependencies } from '../../common/service/get_saved_searches';
import type { SavedSearchesServiceDeps } from './saved_searches_service';
export declare const createGetSavedSearchDeps: ({ spaces, savedObjectsTaggingOss, search, contentManagement, }: SavedSearchesServiceDeps) => GetSavedSearchDependencies;
