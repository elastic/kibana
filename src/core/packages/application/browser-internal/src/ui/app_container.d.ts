import type { Observable } from 'rxjs';
import type { FC } from 'react';
import type { CoreTheme } from '@kbn/core-theme-browser';
import type { MountPoint } from '@kbn/core-mount-utils-browser';
import { AppStatus, type AppLeaveHandler, type ScopedHistory } from '@kbn/core-application-browser';
import type { Mounter } from '../types';
interface Props {
    /** Path application is mounted on without the global basePath */
    appPath: string;
    appId: string;
    mounter?: Mounter;
    theme$: Observable<CoreTheme>;
    appStatus: AppStatus;
    setAppLeaveHandler: (appId: string, handler: AppLeaveHandler) => void;
    setAppActionMenu: (appId: string, mount: MountPoint | undefined) => void;
    createScopedHistory: (appUrl: string) => ScopedHistory;
    setIsMounting: (isMounting: boolean) => void;
    showPlainSpinner?: boolean;
}
export declare const AppContainer: FC<Props>;
export {};
