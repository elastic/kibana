import type { Observable } from 'rxjs';
import type { ScopedHistory, Capabilities, ThemeServiceStart, CoreStart, ChromeBreadcrumb, CoreTheme, AppDeepLinkLocations } from '@kbn/core/public';
import type { LocatorPublic } from '@kbn/share-plugin/common';
import type { CardsNavigationComponentProps } from '@kbn/management-cards-navigation';
import type { ChromeStyle } from '@kbn/core-chrome-browser';
import type { ManagementSection, RegisterManagementSectionArgs } from './utils';
import type { ManagementAppLocatorParams } from '../common/locator';
/** @public */
export interface AutoOpsStatusResult {
    isCloudConnectAutoopsEnabled: boolean;
    isLoading: boolean;
}
/** @public */
export type AutoOpsStatusHook = () => AutoOpsStatusResult;
export interface ManagementSetup {
    sections: SectionsServiceSetup;
    locator: LocatorPublic<ManagementAppLocatorParams>;
    /**
     * Registers a hook that returns the AutoOps status.
     * Used by the cloud_connect plugin to provide connection status to the management landing page.
     */
    registerAutoOpsStatusHook: (hook: AutoOpsStatusHook) => void;
}
export interface DefinedSections {
    ingest: ManagementSection;
    data: ManagementSection;
    insightsAndAlerting: ManagementSection;
    machineLearning: ManagementSection;
    modelManagement: ManagementSection;
    security: ManagementSection;
    kibana: ManagementSection;
    stack: ManagementSection;
    ai: ManagementSection;
    clusterPerformance: ManagementSection;
}
export interface ManagementStart {
    setupCardsNavigation: ({ enabled, hideLinksTo, extendCardNavDefinitions, }: NavigationCardsSubject) => void;
}
export interface ManagementSectionsStartPrivate {
    getSectionsEnabled: () => ManagementSection[];
}
export interface SectionsServiceStartDeps {
    capabilities: Capabilities;
}
export interface SectionsServiceSetup {
    register: (args: Omit<RegisterManagementSectionArgs, 'capabilities'>) => ManagementSection;
    section: DefinedSections;
}
export interface SectionsServiceStart {
    getSectionsEnabled: () => ManagementSection[];
}
export declare enum ManagementSectionId {
    Ingest = "ingest",
    Data = "data",
    InsightsAndAlerting = "insightsAndAlerting",
    MachineLearning = "ml",
    ModelManagement = "modelManagement",
    Security = "security",
    Kibana = "kibana",
    Stack = "stack",
    AI = "ai",
    ClusterPerformance = "clusterPerformance"
}
export type Unmount = () => Promise<void> | void;
export type Mount = (params: ManagementAppMountParams) => Unmount | Promise<Unmount>;
export interface ManagementAppMountParams {
    basePath: string;
    element: HTMLElement;
    setBreadcrumbs: (crumbs: ChromeBreadcrumb[]) => void;
    history: ScopedHistory;
    theme: ThemeServiceStart;
    /** @deprecated - use `theme` **/
    theme$: Observable<CoreTheme>;
}
export interface CreateManagementItemArgs {
    id: string;
    title: string;
    tip?: string;
    order?: number;
    euiIconType?: string;
    icon?: string;
    hideFromSidebar?: boolean;
    hideFromGlobalSearch?: boolean;
    visibleIn?: AppDeepLinkLocations[];
    capabilitiesId?: string;
    redirectFrom?: string;
}
export interface NavigationCardsSubject extends Pick<CardsNavigationComponentProps, 'hideLinksTo'> {
    enabled: boolean;
    extendCardNavDefinitions?: CardsNavigationComponentProps['extendedCardNavigationDefinitions'];
}
export interface AppDependencies {
    appBasePath: string;
    kibanaVersion: string;
    sections: ManagementSection[];
    cardsNavigationConfig?: NavigationCardsSubject;
    chromeStyle?: ChromeStyle;
    coreStart: CoreStart;
    cloud?: {
        isCloudEnabled: boolean;
        baseUrl?: string;
    };
    isAirGapped: boolean;
    getAutoOpsStatusHook: () => AutoOpsStatusHook;
}
export interface ConfigSchema {
    deeplinks: {
        navLinkStatus: 'default' | 'visible';
    };
}
