import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { FileClient } from './types';
/**
 * Arguments to create an ES file client.
 */
export interface CreateEsFileClientArgs {
    /**
     * The name of the ES index that will store file metadata.
     */
    metadataIndex: string;
    /**
     * The name of the ES index that will store file contents.
     */
    blobStorageIndex: string;
    /**
     * An elasticsearch client that will be used to interact with the cluster.
     */
    elasticsearchClient: ElasticsearchClient;
    /**
     * Treat the indices provided as Aliases/Datastreams.
     * When set to `true`:
     * - additional ES calls will be made to get the real backing indexes
     * - will not check if indexes exists and attempt to create them if not
     * - an additional `@timestamp` property will be written to all documents (at root of document)
     */
    indexIsAlias?: boolean;
    /**
     * The maximum file size to be written.
     */
    maxSizeBytes?: number;
    /**
     * A logger for debugging purposes.
     */
    logger: Logger;
}
/**
 * A utility function for creating an instance of {@link FileClient}
 * that will speak with ES indices only for file functionality.
 *
 * @note This client is not intended to be aware of {@link FileKind}s.
 *
 * @param arg - See {@link CreateEsFileClientArgs}
 */
export declare function createEsFileClient(arg: CreateEsFileClientArgs): FileClient;
