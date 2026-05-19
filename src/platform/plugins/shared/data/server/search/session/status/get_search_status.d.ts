import type { ElasticsearchClient } from '@kbn/core/server';
import { type SearchSessionRequestInfo, type SearchSessionRequestStatus } from '../../../../common';
export declare function getSearchStatus({ search, asyncId, esClient, }: {
    search: SearchSessionRequestInfo;
    asyncId: string;
    esClient: ElasticsearchClient;
}): Promise<SearchSessionRequestStatus>;
