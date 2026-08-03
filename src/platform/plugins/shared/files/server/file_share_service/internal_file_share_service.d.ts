import type { SavedObjectsClientContract, ISavedObjectsRepository } from '@kbn/core/server';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
import type { Pagination, FileShareJSON, FileShareJSONWithToken, FileShare, UpdatableFileShareMetadata } from '../../common/types';
import type { File } from '../../common/types';
import type { FileShareServiceStart } from './types';
/**
 * Arguments for a creating a file share
 */
export interface CreateShareArgs {
    /**
     * Optionally provide a name for this file share instance
     */
    name?: string;
    /**
     * Optionally set an expiration date as unix timestamp for this file share instance
     *
     * @note If not specified the file share will expire after 30 days
     */
    validUntil?: number;
    /**
     * The file object to create the share for
     */
    file: File;
}
/**
 * Arguments for listing file shares.
 */
export interface ListArgs extends Pagination {
    /**
     * The file ID for scope the list to.
     */
    fileId?: string;
}
/**
 * ID argument
 */
interface IdArg {
    /**
     * File share ID.
     */
    id: string;
}
/**
 * Delete file share arguments.
 */
export type DeleteArgs = IdArg;
/**
 * Get file share arguments.
 */
export type GetArgs = IdArg;
/**
 * Delete file shares for file arguments.
 */
export interface DeleteForFileArgs {
    /**
     * The file id to delete the shares for.
     */
    id: string;
}
/**
 * Update file share arguments.
 */
export interface UpdateArgs {
    /**
     * The file share ID.
     */
    id: string;
    /**
     * The updated attributes to store.
     */
    attributes: UpdatableFileShareMetadata;
}
/**
 * Service for managing file shares and associated Saved Objects.
 *
 * @internal
 */
export declare class InternalFileShareService implements FileShareServiceStart {
    private readonly savedObjects;
    private static usageCounter;
    static configureUsageCounter(uc: UsageCounter): void;
    private readonly savedObjectsType;
    constructor(savedObjects: SavedObjectsClientContract | ISavedObjectsRepository);
    private incrementUsageCounter;
    share(args: CreateShareArgs): Promise<FileShareJSONWithToken>;
    delete({ id }: DeleteArgs): Promise<void>;
    private internalList;
    deleteForFile({ id: fileId }: DeleteForFileArgs): Promise<void>;
    /**
     * Get a share token and also check whether it is valid.
     */
    getByToken(token: string): Promise<FileShareJSON>;
    get({ id }: GetArgs): Promise<FileShareJSON>;
    update({ id, attributes }: UpdateArgs): Promise<FileShare & {
        id: string;
    }>;
    list(args: ListArgs): Promise<{
        shares: FileShareJSON[];
    }>;
}
export {};
