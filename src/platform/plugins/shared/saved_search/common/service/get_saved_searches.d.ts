import type { ISearchStartSearchSource } from '@kbn/data-plugin/common';
import type { SpacesApi } from '@kbn/spaces-plugin/public';
import type { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import type { Reference } from '@kbn/content-management-utils';
import type { SavedSearch, SavedSearchAttributes, SerializableSavedSearch } from '../types';
import type { SavedSearchCrudTypes } from '../content_management';
export interface GetSavedSearchDependencies {
    searchSourceCreate: ISearchStartSearchSource['create'];
    getSavedSrch: (id: string) => Promise<SavedSearchCrudTypes['GetOut']>;
    handleGetSavedSrchError?: (error: unknown, savedSearchId: string) => void;
    spaces?: SpacesApi;
    savedObjectsTagging?: SavedObjectsTaggingApi;
}
export declare const getSearchSavedObject: (savedSearchId: string, { spaces, getSavedSrch, handleGetSavedSrchError }: GetSavedSearchDependencies) => Promise<{
    item: import("@kbn/content-management-utils").SOWithMetadata<SavedSearchAttributes>;
    meta: {
        outcome: "exactMatch" | "aliasMatch" | "conflict";
        aliasTargetId?: string;
        aliasPurpose?: "savedObjectConversion" | "savedObjectImport";
    };
}>;
export declare const convertToSavedSearch: <Serialized extends boolean = false, ReturnType = Serialized extends true ? SerializableSavedSearch : SavedSearch>({ savedSearchId, attributes, references, sharingSavedObjectProps, managed, }: {
    savedSearchId: string | undefined;
    attributes: SavedSearchAttributes;
    references: Reference[];
    sharingSavedObjectProps: SavedSearch["sharingSavedObjectProps"];
    managed: boolean | undefined;
}, { searchSourceCreate, savedObjectsTagging }: GetSavedSearchDependencies, serialized?: Serialized) => Promise<ReturnType>;
export declare const getSavedSearch: <Serialized extends boolean = false, ReturnType = Serialized extends true ? SerializableSavedSearch : SavedSearch>(savedSearchId: string, deps: GetSavedSearchDependencies, serialized?: Serialized) => Promise<ReturnType>;
