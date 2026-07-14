import type { AppDeepLinkId, ChromeNavLinks, ChromeBreadcrumb, ChromeSetProjectBreadcrumbsParams, CloudURLs, NavigationCustomization, NavigationTreeDefinition, SolutionId } from '@kbn/core-chrome-browser';
import { Observable } from 'rxjs';
import type { History } from 'history';
import type { Logger } from '@kbn/logging';
interface StartDeps {
    history: History;
    prependBasePath: (path: string) => string;
    navLinks: ChromeNavLinks;
    getUiSettingsHomeRoute: () => string | undefined;
    logger: Logger;
    chromeBreadcrumbs$: Observable<ChromeBreadcrumb[]>;
    isNextChrome: boolean;
}
export declare class ProjectNavigationService {
    private isServerless;
    private readonly stop$;
    private readonly customization$;
    private readonly customizeNavigationHandler$;
    constructor(isServerless: boolean);
    start(startDeps: StartDeps): {
        getProjectHome$: () => Observable<string>;
        setCloudUrls: (cloudUrls: CloudURLs) => void;
        setKibanaName: (kibanaName: string) => void;
        getKibanaName$: () => Observable<string | undefined>;
        initNavigation: <LinkId extends AppDeepLinkId = AppDeepLinkId>(id: SolutionId, navTreeDefinition$: Observable<NavigationTreeDefinition<LinkId>>) => void;
        getNavigation$: () => Observable<{
            solutionId: "security" | "workplaceai" | "vectordb" | "oblt" | "es";
            navigationTree: import("@kbn/core-chrome-browser").NavigationTreeDefinitionUI;
            activeNodes: import("@kbn/core-chrome-browser").ChromeProjectNavigationNode[][];
            overflowItemIds: string[];
            defaultItemIds: string[];
            renderableNodes: import("@kbn/core-chrome-browser").ChromeProjectNavigationNode[];
        }>;
        setProjectBreadcrumbs: (breadcrumbs: ChromeBreadcrumb | ChromeBreadcrumb[], params?: Partial<ChromeSetProjectBreadcrumbsParams>) => void;
        getProjectBreadcrumbs$: () => Observable<ChromeBreadcrumb[]>;
        getActiveSolutionNavId$: () => Observable<"security" | "workplaceai" | "vectordb" | "oblt" | "es" | null>;
        getActiveSolutionNavId: () => "security" | "workplaceai" | "vectordb" | "oblt" | "es" | null;
        setNavigationCustomization: (customization: NavigationCustomization | undefined) => void;
        getCustomizeNavigationHandler$: () => Observable<(() => void) | null>;
        registerCustomizeNavigationHandler: (handler: () => void) => void;
    };
    stop(): void;
}
export {};
