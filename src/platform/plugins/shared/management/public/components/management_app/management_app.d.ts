import React from 'react';
import type { BehaviorSubject, Observable } from 'rxjs';
import type { AppMountParameters, ChromeBreadcrumb } from '@kbn/core/public';
import type { CoreStart } from '@kbn/core/public';
import type { ChromeStyle } from '@kbn/core-chrome-browser';
import type { SectionsServiceStart, NavigationCardsSubject, AutoOpsStatusHook } from '../../types';
interface ManagementAppProps {
    appBasePath: string;
    history: AppMountParameters['history'];
    dependencies: ManagementAppDependencies;
}
export interface ManagementAppDependencies {
    sections: SectionsServiceStart;
    kibanaVersion: string;
    coreStart: CoreStart;
    cloud?: {
        isCloudEnabled: boolean;
        baseUrl?: string;
    };
    isAirGapped: boolean;
    setBreadcrumbs: (newBreadcrumbs: ChromeBreadcrumb[]) => void;
    isSidebarEnabled$: BehaviorSubject<boolean>;
    cardsNavigationConfig$: BehaviorSubject<NavigationCardsSubject>;
    chromeStyle$: Observable<ChromeStyle>;
    getAutoOpsStatusHook: () => AutoOpsStatusHook;
}
export declare const ManagementApp: ({ dependencies, history, appBasePath }: ManagementAppProps) => React.JSX.Element | null;
export {};
