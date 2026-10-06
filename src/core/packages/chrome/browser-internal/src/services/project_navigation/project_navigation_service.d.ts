import type { AppDeepLinkId, ChromeNavLinks, ChromeBreadcrumb, ChromeSetProjectBreadcrumbsParams, CloudURLs, NavigationCustomization, NavigationTreeDefinition, SolutionId, ProjectNavigationLinks } from '@kbn/core-chrome-browser';
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
}
export declare class ProjectNavigationService {
    private isServerless;
    private readonly stop$;
    private readonly customization$;
    private readonly customizeNavigationHandler$;
    private readonly registeredLinks$;
    constructor(isServerless: boolean);
    start(startDeps: StartDeps): {
        getProjectHome$: () => Observable<string>;
        setCloudUrls: (cloudUrls: CloudURLs) => void;
        setKibanaName: (kibanaName: string) => void;
        getKibanaName$: () => Observable<string | undefined>;
        initNavigation: <LinkId extends AppDeepLinkId = AppDeepLinkId>(id: SolutionId, navTreeDefinition$: Observable<NavigationTreeDefinition<LinkId>>) => void;
        getNavigation$: () => Observable<{
            solutionId: "es" | "oblt" | "security" | "vectordb" | "workplaceai";
            navigationTree: import("@kbn/core-chrome-browser").NavigationTreeDefinitionUI;
            activeNodes: import("@kbn/core-chrome-browser").ChromeProjectNavigationNode[][];
            overflowItemIds: string[];
            defaultItemIds: string[];
            renderableNodes: import("@kbn/core-chrome-browser").ChromeProjectNavigationNode[];
        }>;
        setProjectBreadcrumbs: (breadcrumbs: ChromeBreadcrumb | ChromeBreadcrumb[], params?: Partial<ChromeSetProjectBreadcrumbsParams>) => void;
        getProjectBreadcrumbs$: () => Observable<ChromeBreadcrumb[]>;
        getActiveSolutionNavId$: () => Observable<"es" | "oblt" | "security" | "vectordb" | "workplaceai" | null>;
        getActiveSolutionNavId: () => "es" | "oblt" | "security" | "vectordb" | "workplaceai" | null;
        setNavigationCustomization: (customization: NavigationCustomization | undefined) => void;
        getCustomizeNavigationHandler$: () => Observable<(() => void) | null>;
        registerCustomizeNavigationHandler: (handler: () => void) => void;
        registerNavigationLinks: (links: ProjectNavigationLinks) => void;
        getRegisteredNavigationLinks$: () => Observable<readonly ProjectNavigationLinks[]>;
    };
    stop(): void;
}
export {};
