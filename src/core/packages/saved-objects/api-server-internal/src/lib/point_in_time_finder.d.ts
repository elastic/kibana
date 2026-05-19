import type { Logger } from '@kbn/logging';
import type { SavedObjectsFindResponse, SavedObjectsCreatePointInTimeFinderDependencies, SavedObjectsCreatePointInTimeFinderOptions, ISavedObjectsPointInTimeFinder, SavedObjectsFindInternalOptions } from '@kbn/core-saved-objects-api-server';
/**
 * @internal
 */
export interface PointInTimeFinderDependencies extends SavedObjectsCreatePointInTimeFinderDependencies {
    logger: Logger;
    internalOptions?: SavedObjectsFindInternalOptions;
}
/**
 * @internal
 */
export type CreatePointInTimeFinderFn = <T = unknown, A = unknown>(findOptions: SavedObjectsCreatePointInTimeFinderOptions, dependencies?: SavedObjectsCreatePointInTimeFinderDependencies, internalOptions?: SavedObjectsFindInternalOptions) => ISavedObjectsPointInTimeFinder<T, A>;
/**
 * @internal
 */
export declare class PointInTimeFinder<T = unknown, A = unknown> implements ISavedObjectsPointInTimeFinder<T, A> {
    #private;
    constructor(findOptions: SavedObjectsCreatePointInTimeFinderOptions, { logger, client, internalOptions }: PointInTimeFinderDependencies);
    find(): AsyncGenerator<SavedObjectsFindResponse<T, A>, void, unknown>;
    close(): Promise<void>;
    private open;
    private findNext;
    private getLastHitSortValue;
}
