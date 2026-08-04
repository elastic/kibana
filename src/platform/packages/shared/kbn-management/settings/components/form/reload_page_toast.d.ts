import type { ToastInput } from '@kbn/core-notifications-browser';
export declare const DATA_TEST_SUBJ_PAGE_RELOAD_BUTTON = "pageReloadButton";
/**
 * Utility function for returning a {@link ToastInput} for displaying a prompt for reloading the page.
 * @returns A toast.
 */
export declare const reloadPageToast: () => ToastInput;
