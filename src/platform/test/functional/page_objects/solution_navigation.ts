/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import type { AppDeepLinkId } from '@kbn/core-chrome-browser';

type NavigationId = string;

import type { WebElementWrapper } from '@kbn/ftr-common-functional-ui-services';
import type { FtrProviderContext } from '../ftr_provider_context';

const TIMEOUT_CHECK = 3000;

export function SolutionNavigationProvider(ctx: Pick<FtrProviderContext, 'getService'>) {
  const testSubjects = ctx.getService('testSubjects');
  const browser = ctx.getService('browser');
  const retry = ctx.getService('retry');
  const log = ctx.getService('log');

  async function expandMoreIfNeeded() {
    log.debug(
      'SolutionNavigation.sidenav.expandMoreIfNeeded - checking if "More" menu needs to be expanded'
    );
    const moreMenuExists = await testSubjects.exists('kbnChromeNav-moreMenuTrigger', {
      timeout: TIMEOUT_CHECK,
    });

    if (moreMenuExists) {
      await retry.try(async () => {
        const moreMenuItem = await testSubjects.find('kbnChromeNav-moreMenuTrigger', TIMEOUT_CHECK);
        let isExpanded = await moreMenuItem.getAttribute('aria-expanded');

        // If any popover is open, close it first with Escape to ensure clean state
        // This handles cases where a nested panel might be showing
        if (isExpanded === 'true') {
          await browser.pressKeys(browser.keys.ESCAPE);
          // Wait for popover to close
          await retry.waitFor('popover to close after Escape', async () => {
            const popoverExists = await testSubjects.exists('side-nav-popover-More', {
              timeout: 500,
            });
            return !popoverExists;
          });
        }

        // Now click to open the More menu
        await moreMenuItem.click();
        // Wait for the More menu popover to appear
        await retry.waitFor('More menu popover to appear after click', async () => {
          return await testSubjects.exists('side-nav-popover-More', { timeout: 500 });
        });

        isExpanded = await moreMenuItem.getAttribute('aria-expanded');
        if (isExpanded === 'false') {
          throw new Error('More menu still hidden');
        }
      });
    }
  }

  async function collapseMoreIfNeeded() {
    log.debug(
      'SolutionNavigation.sidenav.collapseMoreIfNeeded - checking if "More" menu needs to be collapsed'
    );
    if (await testSubjects.exists('kbnChromeNav-moreMenuTrigger', { timeout: TIMEOUT_CHECK })) {
      // TODO: find a better way to collapse
      // https://github.com/elastic/kibana/issues/236242
      await retry.try(async () => {
        const moreMenuItem = await testSubjects.find('kbnChromeNav-moreMenuTrigger', TIMEOUT_CHECK);
        let isExpanded = await moreMenuItem.getAttribute('aria-expanded');
        log.debug(
          'SolutionNavigation.sidenav.collapseMoreIfNeeded - More Popover Visible',
          isExpanded
        );
        if (isExpanded === 'true') {
          await browser.clickMouseButton({ x: 0, y: 0 }); // click outside to close
        }
        isExpanded = await moreMenuItem.getAttribute('aria-expanded');
        if (isExpanded === 'true') {
          throw new Error('More menu still expanded');
        }
      });
    }
  }

  async function getByVisibleText(
    selector: string | (() => Promise<WebElementWrapper[]>),
    text: string
  ) {
    const subjects =
      typeof selector === 'string' ? await testSubjects.findAll(selector) : await selector();
    let found: WebElementWrapper | null = null;
    for (const subject of subjects) {
      const visibleText = await subject.getVisibleText();
      const ariaLabel = await subject.getAttribute('aria-label');
      if (visibleText === text || ariaLabel === text) {
        found = subject;
        break;
      }
    }
    return found;
  }

  return {
    // check that chrome ui is in project/solution mode
    async expectExists() {
      await testSubjects.existOrFail('kibanaProjectHeader');
    },
    async clickLogo() {
      await testSubjects.click('nav-header-logo');
    },
    // side nav related actions
    sidenav: {
      expandMore: expandMoreIfNeeded,
      collapseMore: collapseMoreIfNeeded,
      async expectLinkExists(
        by:
          | { deepLinkId: AppDeepLinkId }
          | { navId: string }
          | { text: string }
          | { panelNavLinkId: string }
      ) {
        log.debug('SolutionNavigation.sidenav.expectLinkExists', JSON.stringify(by));

        if ('deepLinkId' in by) {
          const exists = await testSubjects.exists(`~nav-item-deepLinkId-${by.deepLinkId}`, {
            timeout: TIMEOUT_CHECK,
          });
          if (!exists) {
            await expandMoreIfNeeded();
            await testSubjects.existOrFail(`~nav-item-deepLinkId-${by.deepLinkId}`, {
              timeout: TIMEOUT_CHECK,
            });
          }
        } else if ('navId' in by) {
          const exists = await testSubjects.exists(`~nav-item-id-${by.navId}`, {
            timeout: TIMEOUT_CHECK,
          });
          if (!exists) {
            await expandMoreIfNeeded();
            await testSubjects.existOrFail(`~nav-item-id-${by.navId}`, { timeout: TIMEOUT_CHECK });
          }
        } else if ('panelNavLinkId' in by) {
          const exists = await testSubjects.exists(`~nav-item-id-${by.panelNavLinkId}`, {
            timeout: TIMEOUT_CHECK,
          });
          if (!exists) {
            await expandMoreIfNeeded();
            await testSubjects.existOrFail(`~nav-item-id-${by.panelNavLinkId}`, {
              timeout: TIMEOUT_CHECK,
            });
          }
        } else {
          let link = await getByVisibleText('~nav-item', by.text);
          if (!link) {
            await expandMoreIfNeeded();
            link = await getByVisibleText('~nav-item', by.text);
          }
          expect(link).not.be(null);
        }
      },
      async expectLinkMissing(
        by: { deepLinkId: AppDeepLinkId } | { navId: string } | { text: string }
      ) {
        if ('deepLinkId' in by) {
          await testSubjects.missingOrFail(`~nav-item-deepLinkId-${by.deepLinkId}`, {
            timeout: TIMEOUT_CHECK,
          });
        } else if ('navId' in by) {
          await testSubjects.missingOrFail(`~nav-item-id-${by.navId}`, { timeout: TIMEOUT_CHECK });
        } else {
          expect(await getByVisibleText('~nav-item', by.text)).be(null);
        }
      },
      async expectLinkActive(
        by: { deepLinkId: AppDeepLinkId } | { navId: string } | { text: string }
      ) {
        await this.expectLinkExists(by);
        if ('deepLinkId' in by) {
          await testSubjects.existOrFail(
            `~nav-item-deepLinkId-${by.deepLinkId} & ~nav-item-isActive`,
            { timeout: TIMEOUT_CHECK }
          );
        } else if ('navId' in by) {
          await testSubjects.existOrFail(`~nav-item-id-${by.navId} & ~nav-item-isActive`, {
            timeout: TIMEOUT_CHECK,
          });
        } else {
          await retry.try(async () => {
            const link = await getByVisibleText('~nav-item', by.text);
            expect(await link!.elementHasClass(`nav-item-isActive`)).to.be(true);
          });
        }
      },
      async clickLink(by: { deepLinkId: AppDeepLinkId } | { navId: string } | { text: string }) {
        log.debug('SolutionNavigation.sidenav.clickLink', JSON.stringify(by));

        const clickLinkByDeepLinkId = async (deepLinkId: string) => {
          // Wait for link to be available (visible and enabled)
          // This includes waiting for nested panel contents to render after panel animations
          await retry.waitFor(`deepLinkId ${deepLinkId} to be clickable`, async () => {
            // First check if it's in main nav or any open panels (e.g., nested panel)
            // Use a longer timeout to account for panel animations
            const existsInMain = await testSubjects.exists(`~nav-item-deepLinkId-${deepLinkId}`, {
              timeout: 2500,
            });
            if (existsInMain) {
              return true;
            }

            // If not in main nav/panels, try expanding More menu
            await expandMoreIfNeeded();

            const existsInMore = await testSubjects.exists(`~nav-item-deepLinkId-${deepLinkId}`, {
              timeout: 2500,
            });
            return existsInMore;
          });

          await testSubjects.click(`~nav-item-deepLinkId-${deepLinkId}`);
        };

        const clickLinkByNavId = async (navId: string) => {
          // Wait for link to be available (visible and enabled)
          // This includes waiting for nested panel contents to render after panel animations
          await retry.waitFor(`navId ${navId} to be clickable`, async () => {
            // First check if it's in main nav or any open panels (e.g., nested panel)
            // Use a longer timeout to account for panel animations
            const existsInMain = await testSubjects.exists(`~nav-item-id-${navId}`, {
              timeout: 2500,
            });
            if (existsInMain) {
              return true;
            }

            // If not in main nav/panels, try expanding More menu
            await expandMoreIfNeeded();

            const existsInMore = await testSubjects.exists(`~nav-item-id-${navId}`, {
              timeout: 2500,
            });
            return existsInMore;
          });

          await testSubjects.click(`~nav-item-id-${navId}`);
        };

        const clickLinkByText = async (text: string) => {
          // Wait for link to be available
          // This includes waiting for nested panel contents to render after panel animations
          await retry.waitFor(`link with text "${text}" to be available`, async () => {
            // First check if it's in main nav or any open panels (e.g., nested panel)
            let link = await getByVisibleText('~nav-item', text);
            if (link) {
              return true;
            }

            // If not in main nav/panels, try expanding More menu
            await expandMoreIfNeeded();

            link = await getByVisibleText('~nav-item', text);
            if (link) {
              return true;
            }

            return false;
          });

          const link = await getByVisibleText('~nav-item', text);
          await link!.click();
        };

        if ('deepLinkId' in by) {
          await clickLinkByDeepLinkId(by.deepLinkId);
        } else if ('navId' in by) {
          await clickLinkByNavId(by.navId);
        } else {
          await clickLinkByText(by.text);
        }
      },
      async findLink(by: { deepLinkId: AppDeepLinkId } | { navId: string } | { text: string }) {
        await this.expectLinkExists(by);
        if ('deepLinkId' in by) {
          return testSubjects.find(`~nav-item-deepLinkId-${by.deepLinkId}`);
        } else if ('navId' in by) {
          return testSubjects.find(`~nav-item-id-${by.navId}`);
        } else {
          return retry.try(async () => {
            const link = await getByVisibleText('~nav-item', by.text);
            return link;
          });
        }
      },
      async expectOnlyDefinedLinks(navItemIds: string[], options?: { checkOrder?: boolean }) {
        const navItemIdRegEx = /nav-item-id-[^\s]+/g;
        const allSideNavLinks = await testSubjects.findAll('*nav-item-id-');
        const foundNavItemIds: string[] = [];
        for (const sideNavItem of allSideNavLinks) {
          const dataTestSubjs = await sideNavItem.getAttribute('data-test-subj');
          const navItemIdMatch = dataTestSubjs?.match(navItemIdRegEx);
          expect(navItemIdMatch).to.be.ok();
          const navItemId = navItemIdMatch![0].replace('nav-item-id-', '');
          expect(navItemIds).to.contain(navItemId);
          foundNavItemIds.push(navItemId);
        }
        expect(foundNavItemIds).to.have.length(
          navItemIds.length,
          `Found nav item list length (${foundNavItemIds.length}) does not match expected length (${
            navItemIds.length
          }) of side nav items.\nFound items with nav ids:${JSON.stringify(foundNavItemIds)}`
        );
        if (options?.checkOrder !== false) {
          for (let i = 0; i < foundNavItemIds.length; i++) {
            expect(foundNavItemIds[i]).to.eql(
              navItemIds[i],
              `Nav item ${foundNavItemIds[i]} @ index ${i} does not match expected item ${navItemIds[i]}`
            );
          }
        } else {
          expect([...foundNavItemIds].sort()).to.eql(
            [...navItemIds].sort(),
            `Nav item ids do not match expected set`
          );
        }
      },
      async clickPanelLink(navId: string) {
        // TODO: find a better way without trying to collapse every time
        // https://github.com/elastic/kibana/issues/236242
        await collapseMoreIfNeeded();
        // TODO: properly distinguish between panel link and main nav link
        // https://github.com/elastic/kibana/issues/236242
        await testSubjects.click(`~nav-item-id-${navId}`);
      },

      async expectPanelExists(sectionId: NavigationId) {
        log.debug('SolutionNavigation.sidenav.expectPanelExists', sectionId);

        // Check for either side panel or nested panel
        const sidePanelExists = await testSubjects.exists(`~kbnChromeNav-sidePanel_${sectionId}`, {
          timeout: TIMEOUT_CHECK,
        });
        const nestedPanelExists = await testSubjects.exists(
          `~kbnChromeNav-nestedPanel-${sectionId}`,
          { timeout: TIMEOUT_CHECK }
        );

        if (!sidePanelExists && !nestedPanelExists) {
          throw new Error(
            `Expected panel "${sectionId}" to exist as either sidePanel or nestedPanel, but neither was found`
          );
        }
      },
      async isPanelOpen(sectionId: NavigationId) {
        try {
          // Check for side panel (when item is in main nav)
          const sidePanelExists = await testSubjects.exists(
            `~kbnChromeNav-sidePanel_${sectionId}`,
            { timeout: 500 }
          );

          if (sidePanelExists) {
            return true;
          }

          // Check for nested panel (when item is in More menu)
          const nestedPanelExists = await testSubjects.exists(
            `~kbnChromeNav-nestedPanel-${sectionId}`,
            { timeout: 500 }
          );

          return nestedPanelExists;
        } catch (e) {
          return false;
        }
      },
      async openPanel(sectionId: NavigationId) {
        log.debug('SolutionNavigation.sidenav.openPanel', sectionId);

        const isOpen = await this.isPanelOpen(sectionId);
        if (isOpen) {
          return;
        }

        let panelOpenerBtn;
        try {
          // First try to find the panel opener button directly
          panelOpenerBtn = await testSubjects.find(`~nav-item-id-${sectionId}`, TIMEOUT_CHECK);
        } catch (firstError) {
          // If not found, try expanding the More menu
          try {
            await expandMoreIfNeeded();

            // Wait for button to appear and be clickable in the More menu popover
            await retry.waitFor(`button ${sectionId} to be clickable in More menu`, async () => {
              try {
                const btn = await testSubjects.find(`~nav-item-id-${sectionId}`, 500);
                const isDisplayed = await btn.isDisplayed();
                const isEnabled = await btn.isEnabled();
                return isDisplayed && isEnabled;
              } catch (e) {
                return false;
              }
            });

            // Now find the button for interaction
            panelOpenerBtn = await testSubjects.find(`~nav-item-id-${sectionId}`, TIMEOUT_CHECK);

            // Ensure it's in view and move mouse to it
            await panelOpenerBtn.scrollIntoViewIfNecessary();
            await panelOpenerBtn.moveMouseTo();
          } catch (secondError) {
            throw new Error(
              `Could not find panel opener button for "${sectionId}" in main nav or More menu`
            );
          }
        }

        await panelOpenerBtn.click();

        // Wait for panel to appear (checks both sidePanel and nestedPanel)
        await retry.waitFor(`panel ${sectionId} to appear after click`, async () => {
          return await this.isPanelOpen(sectionId);
        });
      },
      async isCollapsed() {
        const selector = 'sideNavCollapseButton';
        const collapseNavBtn = await testSubjects.find(selector, TIMEOUT_CHECK);
        return (await collapseNavBtn.getAttribute('aria-expanded')) === 'false';
      },
      async isExpanded() {
        return !(await this.isCollapsed());
      },
      /**
       * Toggles collapsed state of sidenav
       */
      async toggle(collapsed?: boolean) {
        const currentlyCollapsed = await this.isCollapsed();
        const shouldBeCollapsed = collapsed ?? !currentlyCollapsed;

        if (currentlyCollapsed !== shouldBeCollapsed) {
          log.debug(
            'SolutionNavigation.sidenav.toggle',
            shouldBeCollapsed ? 'Collapsing' : 'Expanding'
          );

          const selector = 'sideNavCollapseButton';
          const collapseNavBtn = await testSubjects.find(selector, TIMEOUT_CHECK);
          await collapseNavBtn.click();
        }
      },
    },
    breadcrumbs: {
      async expectExists() {
        await testSubjects.existOrFail('breadcrumbs', { timeout: TIMEOUT_CHECK });
      },
      async clickBreadcrumb(by: { deepLinkId: AppDeepLinkId } | { text: string }) {
        if ('deepLinkId' in by) {
          await testSubjects.click(`~breadcrumb-deepLinkId-${by.deepLinkId}`);
        } else {
          await (await getByVisibleText('~breadcrumb', by.text))?.click();
        }
      },
      getBreadcrumb(by: { deepLinkId: AppDeepLinkId } | { text: string }) {
        if ('deepLinkId' in by) {
          return testSubjects.find(`~breadcrumb-deepLinkId-${by.deepLinkId}`, TIMEOUT_CHECK);
        } else {
          return getByVisibleText('~breadcrumb', by.text);
        }
      },
      async expectBreadcrumbExists(by: { deepLinkId: AppDeepLinkId } | { text: string }) {
        log.debug('SolutionNavigation.breadcrumbs.expectBreadcrumbExists', JSON.stringify(by));
        if ('deepLinkId' in by) {
          await testSubjects.existOrFail(`~breadcrumb-deepLinkId-${by.deepLinkId}`, {
            timeout: TIMEOUT_CHECK,
          });
        } else {
          await retry.try(async () => {
            expect(await getByVisibleText('~breadcrumb', by.text)).not.be(null);
          });
        }
      },
      async expectBreadcrumbMissing(by: { deepLinkId: AppDeepLinkId } | { text: string }) {
        if ('deepLinkId' in by) {
          await testSubjects.missingOrFail(`~breadcrumb-deepLinkId-${by.deepLinkId}`, {
            timeout: TIMEOUT_CHECK,
          });
        } else {
          await retry.try(async () => {
            expect(await getByVisibleText('~breadcrumb', by.text)).be(null);
          });
        }
      },
      async expectBreadcrumbTexts(expectedBreadcrumbTexts: string[]) {
        log.debug(
          'SolutionNavigation.breadcrumbs.expectBreadcrumbTexts',
          JSON.stringify(expectedBreadcrumbTexts)
        );
        await retry.try(async () => {
          const breadcrumbsContainer = await testSubjects.find('breadcrumbs', TIMEOUT_CHECK);
          const breadcrumbs = await breadcrumbsContainer.findAllByTestSubject('~breadcrumb');
          breadcrumbs.shift(); // remove home
          expect(expectedBreadcrumbTexts.length).to.eql(breadcrumbs.length);
          const texts = await Promise.all(breadcrumbs.map((b) => b.getVisibleText()));
          expect(expectedBreadcrumbTexts).to.eql(texts);
        });
      },
    },

    // helper to assert that the page did not reload
    async createNoPageReloadCheck() {
      const trackReloadTs = Date.now();
      await browser.execute(
        ({ ts }) => {
          // @ts-ignore
          window.__testTrackReload__ = ts;
        },
        {
          ts: trackReloadTs,
        }
      );

      return async () => {
        const noReload = await browser.execute(
          ({ ts }) => {
            // @ts-ignore
            return window.__testTrackReload__ && window.__testTrackReload__ === ts;
          },
          {
            ts: trackReloadTs,
          }
        );
        expect(noReload).to.be(true);
      };
    },
  };
}
