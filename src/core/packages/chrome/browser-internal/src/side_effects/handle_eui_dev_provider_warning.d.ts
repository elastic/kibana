import type { NotificationsStart } from '@kbn/core-notifications-browser';
/**
 * Ensure developers are notified if working in a context that lacks the EUI Provider.
 * @internal
 */
export declare function handleEuiDevProviderWarning({ notifications, }: {
    notifications: NotificationsStart;
}): void;
