import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { SavedObjectsEsqlOptions, SavedObjectsEsqlResponse } from '@kbn/core-saved-objects-api-server';
import type { ApiExecutionContext } from './types';
export interface PerformEsqlParams {
    options: SavedObjectsEsqlOptions;
    /** The raw Elasticsearch client, needed because RepositoryEsClient does not expose esql.query() */
    rawClient: ElasticsearchClient;
}
export declare function performEsql({ options, rawClient }: PerformEsqlParams, { registry, helpers, allowedTypes, extensions }: ApiExecutionContext): Promise<SavedObjectsEsqlResponse>;
