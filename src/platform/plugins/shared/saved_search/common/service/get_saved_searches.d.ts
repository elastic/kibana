import type { ISearchStartSearchSource } from '@kbn/data-plugin/common';
import type { SpacesApi } from '@kbn/spaces-plugin/public';
import type { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import type { Reference } from '@kbn/content-management-utils';
import type { DiscoverSessionAttributes } from '../../server';
import type { SavedSearch, SerializableSavedSearch } from '../types';
import type { SavedSearchCrudTypes } from '../content_management';
export interface GetSavedSearchDependencies {
    searchSourceCreate: ISearchStartSearchSource['create'];
    getSavedSrch: (id: string) => Promise<SavedSearchCrudTypes['GetOut']>;
    handleGetSavedSrchError?: (error: unknown, savedSearchId: string) => void;
    spaces?: SpacesApi;
    savedObjectsTagging?: SavedObjectsTaggingApi;
}
export declare const getSearchSavedObject: (savedSearchId: string, { spaces, getSavedSrch, handleGetSavedSrchError }: GetSavedSearchDependencies) => Promise<{
    item: import("@kbn/content-management-utils").SOWithMetadata<Readonly<{} & {
        description: string;
        title: string;
        tabs: Readonly<{} & {
            id: string;
            label: string;
            attributes: Readonly<{
                refreshInterval?: Readonly<{} & {
                    pause: boolean;
                    value: number;
                }> | undefined;
                timeRange?: Readonly<{} & {
                    from: string;
                    to: string;
                }> | undefined;
                viewMode?: import("..").VIEW_MODE | undefined;
                rowHeight?: number | undefined;
                density?: import("@kbn/discover-utils").DataGridDensity | undefined;
                headerRowHeight?: number | undefined;
                sampleSize?: number | undefined;
                rowsPerPage?: number | undefined;
                breakdownField?: string | undefined;
                usesAdHocDataView?: boolean | undefined;
                timeRestore?: boolean | undefined;
                hideAggregatedPreview?: boolean | undefined;
                visContext?: Readonly<{} & {
                    attributes: Record<string, any>;
                    suggestionType: string;
                    requestData: Readonly<{
                        timeField?: string | undefined;
                        dataViewId?: string | undefined;
                        breakdownField?: string | undefined;
                        timeInterval?: string | undefined;
                    } & {}>;
                }> | Readonly<{} & {}> | undefined;
                controlGroupJson?: string | undefined;
                chartInterval?: string | undefined;
            } & {
                sort: string[] | string[][];
                grid: Readonly<{
                    columns?: Record<string, Readonly<{
                        width?: number | undefined;
                    } & {}>> | undefined;
                } & {}>;
                columns: string[];
                hideChart: boolean;
                kibanaSavedObjectMeta: Readonly<{} & {
                    searchSourceJSON: string;
                }>;
                isTextBasedQuery: boolean;
                hideTable: boolean;
            }>;
        }>[];
    }>>;
    meta: {
        outcome: "exactMatch" | "aliasMatch" | "conflict";
        aliasTargetId?: string;
        aliasPurpose?: "savedObjectConversion" | "savedObjectImport";
    };
}>;
export declare const convertToSavedSearch: <Serialized extends boolean = false, ReturnType = Serialized extends true ? SerializableSavedSearch : SavedSearch>({ savedSearchId, attributes, references, sharingSavedObjectProps, managed, }: {
    savedSearchId: string | undefined;
    attributes: DiscoverSessionAttributes;
    references: Reference[];
    sharingSavedObjectProps: SavedSearch["sharingSavedObjectProps"];
    managed: boolean | undefined;
}, { searchSourceCreate, savedObjectsTagging }: GetSavedSearchDependencies, serialized?: Serialized) => Promise<ReturnType>;
export declare const getSavedSearch: <Serialized extends boolean = false, ReturnType = Serialized extends true ? SerializableSavedSearch : SavedSearch>(savedSearchId: string, deps: GetSavedSearchDependencies, serialized?: Serialized) => Promise<ReturnType>;
