import React from 'react';
import { type Observable } from 'rxjs';
import type { MountPoint } from '@kbn/core/public';
import type { AnalyticsServiceStart } from '@kbn/core-analytics-browser';
import type { CoreTheme } from '@kbn/core-theme-browser';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
/**
 * @deprecated use `ToMountPointParams` from `@kbn/react-kibana-mount`
 */
export interface ToMountPointOptions {
    analytics?: AnalyticsServiceStart;
    theme$?: Observable<CoreTheme>;
    userProfile?: UserProfileService;
}
/**
 * @deprecated use `toMountPoint` from `@kbn/react-kibana-mount`
 */
export declare const toMountPoint: (node: React.ReactNode, { analytics, theme$, userProfile }?: ToMountPointOptions) => MountPoint;
