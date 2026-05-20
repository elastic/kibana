import type { ToastInput } from '@kbn/core-notifications-browser';
import type { I18nStart } from '@kbn/core-i18n-browser';
import type { ThemeServiceStart } from '@kbn/core-theme-browser';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
export declare const DATA_TEST_SUBJ_PAGE_RELOAD_BUTTON = "pageReloadButton";
interface StartDeps {
    theme: ThemeServiceStart;
    i18n: I18nStart;
    userProfile: UserProfileService;
}
/**
 * Utility function for returning a {@link ToastInput} for displaying a prompt for reloading the page.
 * @param theme The {@link ThemeServiceStart} contract.
 * @param i18nStart The {@link I18nStart} contract.
 * @returns A toast.
 */
export declare const reloadPageToast: (startDeps: StartDeps) => ToastInput;
export {};
