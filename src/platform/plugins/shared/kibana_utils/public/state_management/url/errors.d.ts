import type { NotificationsStart } from '@kbn/core/public';
export declare const restoreUrlErrorTitle: string;
export declare const saveStateInUrlErrorTitle: string;
export declare const flushNotifyOnErrors: () => void;
/**
 * Helper for configuring {@link IKbnUrlStateStorage} to notify about inner errors
 *
 * @example
 * ```ts
 * const kbnUrlStateStorage = createKbnUrlStateStorage({
 *  history,
 *  ...withNotifyOnErrors(core.notifications.toast))
 * }
 * ```
 * @param toast - toastApi from core.notifications.toasts
 */
export declare const withNotifyOnErrors: (toasts: NotificationsStart["toasts"]) => {
    onGetError: (e: Error) => void;
    onSetError: (e: Error) => void;
};
