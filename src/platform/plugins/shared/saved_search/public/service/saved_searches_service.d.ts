import type { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { SavedObjectTaggingOssPluginStart } from '@kbn/saved-objects-tagging-oss-plugin/public';
import type { SpacesApi } from '@kbn/spaces-plugin/public';
import type { SavedSearch, SerializableSavedSearch } from '../../common/types';
import type { SaveSavedSearchOptions } from './save_saved_searches';
import type { SaveDiscoverSessionOptions, SaveDiscoverSessionParams } from './save_discover_session';
import type { SavedSearchUnwrapResult } from './to_saved_search';
export interface SavedSearchesServiceDeps {
    search: DataPublicPluginStart['search'];
    contentManagement: ContentManagementPublicStart['client'];
    spaces?: SpacesApi;
    savedObjectsTaggingOss?: SavedObjectTaggingOssPluginStart;
}
export declare class SavedSearchesService {
    private deps;
    constructor(deps: SavedSearchesServiceDeps);
    get: <Serialized extends boolean = false>(savedSearchId: string, serialized?: Serialized) => Promise<Serialized extends true ? SerializableSavedSearch : SavedSearch>;
    getDiscoverSession: (discoverSessionId: string) => Promise<import("../../common").DiscoverSession>;
    getAll: () => Promise<import("@kbn/content-management-utils").SOWithMetadata<Readonly<{} & {
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
    }>>[]>;
    save: (savedSearch: SavedSearch, options?: SaveSavedSearchOptions) => Promise<string | undefined>;
    saveDiscoverSession: (discoverSession: SaveDiscoverSessionParams, options?: SaveDiscoverSessionOptions) => Promise<import("../../common").DiscoverSession | undefined>;
    hasLibraryItemWithTitle: (title: string) => Promise<boolean>;
    byValueToSavedSearch: <Serialized extends boolean = false>(result: SavedSearchUnwrapResult, serialized?: Serialized) => Promise<Serialized extends true ? SerializableSavedSearch : SavedSearch>;
}
