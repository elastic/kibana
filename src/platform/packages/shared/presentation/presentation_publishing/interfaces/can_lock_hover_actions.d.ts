import type { PublishingSubject } from '../publishing_subject';
/**
 * This API can lock hover actions
 */
export interface CanLockHoverActions {
    hasLockedHoverActions$: PublishingSubject<boolean>;
    lockHoverActions: (lock: boolean) => void;
}
export declare const apiCanLockHoverActions: (api: unknown) => api is CanLockHoverActions;
