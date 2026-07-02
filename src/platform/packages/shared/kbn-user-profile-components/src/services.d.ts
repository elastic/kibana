import type { FC, PropsWithChildren } from 'react';
import type { I18nStart } from '@kbn/core-i18n-browser';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import type { ThemeServiceStart } from '@kbn/core-theme-browser';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
import type { toMountPoint } from '@kbn/react-kibana-mount';
import type { UserProfileAPIClient } from './types';
type NotifyFn = (data: {
    title: string;
    text?: JSX.Element;
}, options?: {
    durationMs?: number;
}) => void;
export interface Services {
    userProfileApiClient: UserProfileAPIClient;
    notifySuccess: NotifyFn;
}
/**
 * Abstract external service Provider.
 */
export declare const UserProfilesProvider: FC<PropsWithChildren<Services>>;
/**
 * Kibana-specific service types.
 */
export interface UserProfilesKibanaDependencies {
    /** CoreStart contract */
    core: {
        notifications: NotificationsStart;
        theme: ThemeServiceStart;
        userProfile: UserProfileService;
        i18n: I18nStart;
    };
    security: {
        userProfiles: UserProfileAPIClient;
    };
    /**
     * Handler from the '@kbn/react-kibana-mount' Package
     *
     * ```
     * import { toMountPoint } from '@kbn/react-kibana-mount';
     * ```
     */
    toMountPoint: typeof toMountPoint;
}
/**
 * Kibana-specific Provider that maps to known dependency types.
 */
export declare const UserProfilesKibanaProvider: FC<PropsWithChildren<UserProfilesKibanaDependencies>>;
/**
 * React hook for accessing pre-wired services.
 */
export declare function useUserProfiles(): Services;
export {};
