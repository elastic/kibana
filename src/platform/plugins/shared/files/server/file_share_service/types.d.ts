import type { FileShareJSON, FileShare } from '../../common/types';
import type { GetArgs, UpdateArgs, DeleteArgs, ListArgs } from './internal_file_share_service';
/**
 * We only expose functionality here that do not require you to have a {@link File}
 * instance loaded.
 */
export interface FileShareServiceStart {
    /**
     * Get a share instance
     *
     * @param {GetArgs} arg - the arguments to get the share instance
     */
    get(arg: GetArgs): Promise<FileShareJSON>;
    /**
     * List share objects
     *
     * @param {ListArgs} arg - the arguments to list share objects
     */
    list(arg: ListArgs): Promise<{
        shares: FileShareJSON[];
    }>;
    /**
     * Update a share instance.
     *
     * @param {UpdateArgs} args - the arguments to update a share instance
     */
    update(args: UpdateArgs): Promise<FileShare & {
        id: string;
    }>;
    /**
     * Delete a share instance.
     *
     * @param {DeleteArgs} args - the arguments to delete a share instance
     */
    delete(args: DeleteArgs): Promise<void>;
}
