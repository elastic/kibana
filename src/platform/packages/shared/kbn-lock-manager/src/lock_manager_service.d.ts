import type { CoreSetup, Logger } from '@kbn/core/server';
import type { LockId } from './lock_manager_client';
export declare class LockManagerService {
    private readonly coreSetup;
    private readonly logger;
    constructor(coreSetup: CoreSetup<any>, logger: Logger);
    /**
     * Acquires a lock with the given ID and executes the callback function.
     * If the lock is already held by another process, the callback will not be executed.
     *
     * Example usage:
     *
     * const { withLock } = new LockManagerService(coreSetup, logger);
     * await withLock('my_lock', () => {
     *  // perform operation
     * });
     */
    withLock<T>(lockId: LockId, callback: () => Promise<T>, { metadata, }?: {
        metadata?: Record<string, any>;
    }): Promise<T>;
    getLock(lockId: LockId): Promise<import("./lock_manager_client").LockDocument | undefined>;
}
