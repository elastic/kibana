import type { Logger } from '@kbn/core/server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { FilesMetrics, FileMetadata } from '../../../../common';
import type { FindFileArgs } from '../../../file_service';
import type { DeleteArg, FileDescriptor, FileMetadataClient, GetArg, GetUsageMetricsArgs, UpdateArgs } from '../file_metadata_client';
export interface FileDocument<M = unknown> {
    file: FileMetadata<M>;
    /** Written only when `indexIsAlias` is `true` */
    '@timestamp'?: string;
}
export declare class EsIndexFilesMetadataClient<M = unknown> implements FileMetadataClient {
    private readonly index;
    private readonly esClient;
    private readonly logger;
    private readonly indexIsAlias;
    constructor(index: string, esClient: ElasticsearchClient, logger: Logger, indexIsAlias?: boolean);
    private createIfNotExists;
    private getBackingIndex;
    create({ id, metadata }: FileDescriptor<M>): Promise<FileDescriptor<M>>;
    get({ id }: GetArg): Promise<FileDescriptor<M>>;
    bulkGet(arg: {
        ids: string[];
        throwIfNotFound?: true;
    }): Promise<FileDescriptor[]>;
    delete({ id }: DeleteArg): Promise<void>;
    update({ id, metadata }: UpdateArgs<M>): Promise<FileDescriptor<M>>;
    private paginationToES;
    private attrPrefix;
    find({ page, perPage, ...filterArgs }?: FindFileArgs): Promise<{
        total: number;
        files: Array<FileDescriptor<unknown>>;
    }>;
    getUsageMetrics(arg: GetUsageMetricsArgs): Promise<FilesMetrics>;
}
