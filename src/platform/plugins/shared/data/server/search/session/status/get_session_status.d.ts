import type { ElasticsearchClient } from '@kbn/core/server';
import type { SearchSessionSavedObjectAttributes } from '../../../../common';
import type { SessionStatus } from '../types';
export declare function getSessionStatus(deps: {
    esClient: ElasticsearchClient;
}, session: SearchSessionSavedObjectAttributes, opts?: {
    preferCachedStatus: boolean;
}): Promise<SessionStatus>;
