/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RecentlyAccessedService } from '@kbn/recently-accessed';
import type { SidebarStart } from '@kbn/core-chrome-sidebar';
import type { InternalChromeStart } from './types';
import type { ChromeState } from './state/chrome_state';
import type { NavLinksService } from './services/nav_links';
import type { ProjectNavigationService } from './services/project_navigation';
import type { DocTitleService } from './services/doc_title';
type NavLinksStart = ReturnType<NavLinksService['start']>;
type ProjectNavigationStart = ReturnType<ProjectNavigationService['start']>;
type DocTitleStart = ReturnType<DocTitleService['start']>;
type RecentlyAccessedStart = ReturnType<RecentlyAccessedService['start']>;
export interface ChromeApiDeps {
  state: ChromeState;
  services: {
    navLinks: NavLinksStart;
    recentlyAccessed: RecentlyAccessedStart;
    docTitle: DocTitleStart;
    projectNavigation: ProjectNavigationStart;
  };
  sidebar: SidebarStart;
  componentDeps: InternalChromeStart['componentDeps'];
}
export declare function createChromeApi({
  state,
  services,
  sidebar,
  componentDeps,
}: ChromeApiDeps): InternalChromeStart;
export {};
