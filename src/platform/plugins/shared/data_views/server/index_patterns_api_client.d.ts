import type { ElasticsearchClient, SavedObjectsClientContract, IUiSettingsClient } from '@kbn/core/server';
import type { GetFieldsOptions, IDataViewsApiClient } from '../common/types';
export declare class IndexPatternsApiServer implements IDataViewsApiClient {
    private readonly esClient;
    private readonly savedObjectsClient;
    private readonly uiSettingsClient;
    private readonly rollupsEnabled;
    constructor(esClient: ElasticsearchClient, savedObjectsClient: SavedObjectsClientContract, uiSettingsClient: IUiSettingsClient, rollupsEnabled: boolean);
    getFieldsForWildcard({ pattern, metaFields, type, rollupIndex, allowNoIndex, indexFilter, fields, includeEmptyFields, abortSignal, runtimeMappings, allowHidden, projectRouting, }: GetFieldsOptions): Promise<{
        fields: import("./fetcher").FieldDescriptor[];
        indices: string[];
    }>;
    /**
     * Is there a user created data view?
     */
    hasUserDataView(): Promise<boolean>;
}
