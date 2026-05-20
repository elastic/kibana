import type { UserProfileData } from '../types';
interface Props {
    notificationSuccess?: {
        /** Flag to indicate if a notification is shown after update. Default: `true` */
        enabled?: boolean;
        /** Customize the title of the notification */
        title?: string;
        /** Customize the "page reload needed" text of the notification */
        pageReloadText?: string;
    };
    /** Predicate to indicate if the update requires a page reload */
    pageReloadChecker?: (previous: UserProfileData | null | undefined, next: UserProfileData) => boolean;
}
export declare const useUpdateUserProfile: ({ notificationSuccess, pageReloadChecker, }?: Props) => {
    /** Update the user profile */
    update: <D extends Partial<UserProfileData>>(updatedData: D) => Promise<D>;
    /** Handler to show a notification after the user profile has been updated */
    showSuccessNotification: ({ isRefreshRequired }?: {
        isRefreshRequired?: boolean;
    }) => void;
    /** The current user profile data */
    userProfileData: UserProfileData | null | undefined;
    /** Flag to indicate if currently updating */
    isLoading: boolean;
    /** Flag to indicate if user profile is enabled */
    userProfileEnabled: boolean | undefined;
    /** Flag to indicate if the user profile has been loaded */
    userProfileLoaded: boolean;
};
export type UpdateUserProfileHook = typeof useUpdateUserProfile;
export {};
