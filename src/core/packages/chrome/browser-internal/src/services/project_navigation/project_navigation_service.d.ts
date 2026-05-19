import type { AppDeepLinkId, ChromeNavLinks, ChromeBreadcrumb, ChromeSetProjectBreadcrumbsParams, ChromeProjectNavigationNode, CloudURLs, NavigationTreeDefinition, NavigationTreeDefinitionUI, SolutionId } from '@kbn/core-chrome-browser';
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
    constructor(isServerless: boolean);
    start(startDeps: StartDeps): {
        getProjectHome$: () => Observable<string>;
        setCloudUrls: (cloudUrls: CloudURLs) => void;
        setKibanaName: (kibanaName: string) => void;
        getKibanaName$: () => Observable<string | undefined>;
        initNavigation: <LinkId extends AppDeepLinkId = AppDeepLinkId>(id: SolutionId, navTreeDefinition$: Observable<NavigationTreeDefinition<LinkId>>) => void;
        getNavigation$: () => Observable<{
            solutionId: "security" | "oblt" | "es" | "workplaceai" | "vectordb";
            navigationTree: NavigationTreeDefinitionUI;
            activeNodes: ChromeProjectNavigationNode[][];
        }>;
        setProjectBreadcrumbs: (breadcrumbs: ChromeBreadcrumb | ChromeBreadcrumb[], params?: Partial<ChromeSetProjectBreadcrumbsParams>) => void;
        getProjectBreadcrumbs$: () => Observable<ChromeBreadcrumb[]>;
        getActiveSolutionNavId$: () => Observable<"security" | "oblt" | "es" | "workplaceai" | "vectordb" | null>;
        getActiveSolutionNavId: () => "security" | "oblt" | "es" | "workplaceai" | "vectordb" | null;
    };
    stop(): void;
}
export {};
