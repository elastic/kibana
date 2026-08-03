import type { Logger } from '@kbn/core/server';
import type { SavedObjectsClientContract, ISavedObjectsRepository } from '@kbn/core-saved-objects-api-server';
import type { FindFileArgs } from '../../../file_service/file_action_types';
import type { FilesMetrics } from '../../../../common/types';
import type { FileMetadataClient, UpdateArgs, GetArg, FileDescriptor, GetUsageMetricsArgs } from '../file_metadata_client';
export declare class SavedObjectsFileMetadataClient implements FileMetadataClient {
    private readonly soType;
    private readonly soClient;
    private readonly logger;
    constructor(soType: string, soClient: SavedObjectsClientContract | ISavedObjectsRepository, logger: Logger);
    create({ id, metadata }: FileDescriptor): Promise<FileDescriptor>;
    update({ id, metadata }: UpdateArgs): Promise<FileDescriptor>;
    get({ id }: GetArg): Promise<FileDescriptor>;
    bulkGet(arg: {
        ids: string[];
        throwIfNotFound?: true;
    }): Promise<FileDescriptor[]>;
    find({ page, perPage, ...filterArgs }?: FindFileArgs): Promise<{
        total: number;
        files: Array<FileDescriptor<unknown>>;
    }>;
    delete({ id }: {
        id: string;
    }): Promise<void>;
    getUsageMetrics({ esFixedSizeIndex: { capacity }, }: GetUsageMetricsArgs): Promise<FilesMetrics>;
}
