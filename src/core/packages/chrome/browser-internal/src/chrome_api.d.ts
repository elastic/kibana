import type { RecentlyAccessedService } from '@kbn/recently-accessed';
import type { SidebarStart } from '@kbn/core-chrome-sidebar';
import type { FeatureFlagsStart } from '@kbn/core-feature-flags-browser';
import type { InternalChromeStart } from './types';
import type { ChromeState } from './state/chrome_state';
import type { NavControlsService } from './services/nav_controls';
import type { NavLinksService } from './services/nav_links';
import type { ProjectNavigationService } from './services/project_navigation';
import type { DocTitleService } from './services/doc_title';
type NavControlsStart = ReturnType<NavControlsService['start']>;
type NavLinksStart = ReturnType<NavLinksService['start']>;
type ProjectNavigationStart = ReturnType<ProjectNavigationService['start']>;
type DocTitleStart = ReturnType<DocTitleService['start']>;
type RecentlyAccessedStart = ReturnType<RecentlyAccessedService['start']>;
export interface ChromeApiDeps {
    state: ChromeState;
    services: {
        navControls: NavControlsStart;
        navLinks: NavLinksStart;
        recentlyAccessed: RecentlyAccessedStart;
        docTitle: DocTitleStart;
        projectNavigation: ProjectNavigationStart;
    };
    sidebar: SidebarStart;
    featureFlags: FeatureFlagsStart;
}
export declare function createChromeApi({ state, services, sidebar, featureFlags, }: ChromeApiDeps): InternalChromeStart;
export {};
