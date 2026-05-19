import type { FunctionComponent } from 'react';
import type { History } from 'history';
import type { Observable } from 'rxjs';
import type { CoreTheme } from '@kbn/core-theme-browser';
import type { MountPoint } from '@kbn/core-mount-utils-browser';
import { type AppLeaveHandler, AppStatus } from '@kbn/core-application-browser';
import type { AnalyticsServiceStart } from '@kbn/core-analytics-browser';
import type { Mounter } from '../types';
interface Props {
    analytics: AnalyticsServiceStart;
    mounters: Map<string, Mounter>;
    history: History;
    theme$: Observable<CoreTheme>;
    appStatuses$: Observable<Map<string, AppStatus>>;
    setAppLeaveHandler: (appId: string, handler: AppLeaveHandler) => void;
    setAppActionMenu: (appId: string, mount: MountPoint | undefined) => void;
    setIsMounting: (isMounting: boolean) => void;
    hasCustomBranding$?: Observable<boolean>;
}
export declare const AppRouter: FunctionComponent<Props>;
export {};
