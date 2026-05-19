import type { ElasticsearchClient, SavedObject, SavedObjectsClientContract } from '@kbn/core/server';
import { type SearchSessionSavedObjectAttributes } from '../../../../common';
import type { SessionStatus } from '../types';
import type { ISearchSessionEBTManager } from '../ebt_manager';
export declare function updateSessionStatus(deps: {
    esClient: ElasticsearchClient;
    savedObjectsClient: SavedObjectsClientContract;
    searchSessionEBTManager?: ISearchSessionEBTManager;
}, session: SavedObject<SearchSessionSavedObjectAttributes>): Promise<SessionStatus>;
