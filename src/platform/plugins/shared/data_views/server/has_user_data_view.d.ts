import type { ElasticsearchClient, SavedObjectsClientContract, SavedObjectsFindResponse } from '@kbn/core/server';
import type { DataViewSavedObjectAttrs } from '../common/data_views';
interface Deps {
    esClient: ElasticsearchClient;
    soClient: SavedObjectsClientContract;
}
export declare const getDataViews: ({ soClient, }: Deps) => Promise<SavedObjectsFindResponse<DataViewSavedObjectAttrs, unknown>>;
/**
 * Checks if user has access to any data view,
 * excluding those that are automatically created by ese (hardcoded)
 * @param esClient
 * @param soClient
 * @param dataViews
 */
export declare const hasUserDataView: ({ esClient, soClient }: Deps, dataViews?: SavedObjectsFindResponse<DataViewSavedObjectAttrs, unknown>) => Promise<boolean>;
export {};
