/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '@kbn/scout';

export interface SidebarSection {
  sectionId: string;
  sectionLinks: string[];
}

export class ManagementPage {
  readonly sidebar;
  readonly appNotFoundContent;

  constructor(private readonly page: ScoutPage) {
    this.sidebar = page.locator('.kbnSolutionNav');
    this.appNotFoundContent = page.testSubj.locator('appNotFoundPageContent');
  }

  async goto(): Promise<void> {
    await this.page.gotoApp('management');
    await this.sidebar.waitFor({ state: 'visible' });
  }

  /**
   * Navigate to the management app without waiting for the sidebar — used by
   * tests that expect the app to be inaccessible (no management privileges).
   */
  async gotoExpectAppNotFound(): Promise<void> {
    await this.page.gotoApp('management');
    await this.appNotFoundContent.waitFor({ state: 'visible' });
  }

  /**
   * Reads the Stack Management sidebar section composition from the DOM.
   * Uses the stable `data-test-subj` attributes on EuiSideNav items
   * (`item.id` is forwarded as `data-test-subj` by the management sidebar).
   */
  async readSidebarSections(): Promise<SidebarSection[]> {
    return this.sidebar.evaluate((nav) => {
      const roots = Array.from(nav.querySelectorAll<HTMLElement>('.euiSideNavItem--root'));
      return roots.flatMap((root) => {
        const sectionId = root
          .querySelector<HTMLElement>(':scope > .euiSideNavItemButton')
          ?.getAttribute('data-test-subj');
        if (!sectionId) return [];
        const sectionLinks = Array.from(
          root.querySelectorAll<HTMLElement>('.euiSideNavItem > a.euiSideNavItemButton')
        )
          .map((a) => a.getAttribute('data-test-subj'))
          .filter((id): id is string => id !== null);
        return [{ sectionId, sectionLinks }];
      });
    });
  }
}
