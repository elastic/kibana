import * as TaskEither from 'fp-ts/TaskEither';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { IndexMapping, VirtualVersionMap } from '@kbn/core-saved-objects-base-server-internal';
import type { RetryableEsClientError } from './catch_retryable_es_client_errors';
import type { IncompatibleMappingException } from './update_mappings';
/** @internal */
export interface UpdateSourceMappingsPropertiesParams {
    client: ElasticsearchClient;
    sourceIndex: string;
    indexMappings: IndexMapping;
    appMappings: IndexMapping;
    indexTypes: string[];
    latestMappingsVersions: VirtualVersionMap;
    hashToVersionMap: Record<string, string>;
}
/**
 * This action tries to update the source mappings properties if there are any changes.
 * @internal
 */
export declare const updateSourceMappingsProperties: ({ client, sourceIndex, indexMappings, appMappings, indexTypes, latestMappingsVersions, hashToVersionMap, }: UpdateSourceMappingsPropertiesParams) => TaskEither.TaskEither<RetryableEsClientError | IncompatibleMappingException, "update_mappings_succeeded">;
