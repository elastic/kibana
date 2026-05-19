import type { ToastsStart } from '@kbn/core/public';
/**
 * Validates a given time filter range, provided by URL or UI
 * Unless valid, it returns false and displays a notification
 */
export declare function validateTimeRange({ from, to }: {
    from: string;
    to: string;
}, toastNotifications: ToastsStart): boolean;
