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

import type { TourStepId } from '@kbn/core-chrome-navigation-tour';

type NavigationId = string;

import type { WebElementWrapper } from '@kbn/ftr-common-functional-ui-services';
import type { FtrProviderContext } from '../ftr_provider_context';

const TIMEOUT_CHECK = 3000;

export function SolutionNavigationProvider(ctx: Pick<FtrProviderContext, 'getService'>) {
  const testSubjects = ctx.getService('testSubjects');
  const browser = ctx.getService('browser');
  const retry = ctx.getService('retry');
  const log = ctx.getService('log');
  const kibanaServer = ctx.getService('kibanaServer');

  async function expandMoreIfNeeded() {
    log.debug(
      'SolutionNavigation.sidenav.expandMoreIfNeeded - checking if "More" menu needs to be expanded'
    );
    if (await testSubjects.exists('kbnChromeNav-moreMenuTrigger', { timeout: TIMEOUT_CHECK })) {
      await retry.try(async () => {
        const moreMenuItem = await testSubjects.find('kbnChromeNav-moreMenuTrigger', TIMEOUT_CHECK);
        let isExpanded = await moreMenuItem.getAttribute('aria-expanded');
        log.debug(
          'SolutionNavigation.sidenav.expandMoreIfNeeded - More Popover Visible',
          isExpanded
        );
        if (isExpanded === 'false') {
          await moreMenuItem.click();
        }
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
          await testSubjects.existOrFail(`~nav-item-deepLinkId-${by.deepLinkId}`, {
            timeout: TIMEOUT_CHECK,
          });
        } else if ('navId' in by) {
          await testSubjects.existOrFail(`~nav-item-id-${by.navId}`, { timeout: TIMEOUT_CHECK });
        } else if ('panelNavLinkId' in by) {
          await testSubjects.existOrFail(`~nav-item-id-${by.panelNavLinkId}`, {
            timeout: TIMEOUT_CHECK,
          });
        } else {
          expect(await getByVisibleText('~nav-item', by.text)).not.be(null);
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
        // TODO: find a better way without expanding every time
        // https://github.com/elastic/kibana/issues/236242
        if ('deepLinkId' in by) {
          await testSubjects.existOrFail(`~nav-item-deepLinkId-${by.deepLinkId}`);
          await testSubjects.click(`~nav-item-deepLinkId-${by.deepLinkId}`);
        } else if ('navId' in by) {
          await testSubjects.existOrFail(`~nav-item-id-${by.navId}`);
          await testSubjects.click(`~nav-item-id-${by.navId}`);
        } else {
          await retry.try(async () => {
            const link = await getByVisibleText('~nav-item', by.text);
            await link!.click();
          });
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
        // TODO: find a better way without trying to dismiss feedback every time
        // https://github.com/elastic/kibana/issues/236242
        await this.feedbackCallout.dismiss();
        // TODO: properly distinguish between panel link and main nav link
        // https://github.com/elastic/kibana/issues/236242
        await testSubjects.click(`~nav-item-id-${navId}`);
      },

      async expectPanelExists(sectionId: NavigationId) {
        log.debug('SolutionNavigation.sidenav.expectPanelExists', sectionId);
        await testSubjects.existOrFail(`~kbnChromeNav-sidePanel_${sectionId}`, {
          timeout: TIMEOUT_CHECK,
        });
      },
      async isPanelOpen(sectionId: NavigationId) {
        try {
          const panel = await testSubjects.find(
            `~kbnChromeNav-sidePanel_${sectionId}`,
            TIMEOUT_CHECK
          );
          return !!panel;
        } catch (e) {
          return false;
        }
      },
      async openPanel(sectionId: NavigationId) {
        log.debug('SolutionNavigation.sidenav.openPanel', sectionId);

        const isOpen = await this.isPanelOpen(sectionId);
        if (isOpen) return;

        const panelOpenerBtn = await testSubjects.find(`~nav-item-id-${sectionId}`, TIMEOUT_CHECK);

        await panelOpenerBtn.click();
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
      tour: {
        reset: async () => {
          log.debug('SolutionNavigation.sidenav.tour.reset');
          await browser.removeLocalStorageItem('solutionNavigationTour:completed');
          try {
            const sidCookie = (await browser.getCookie('sid')).value;
            await kibanaServer.request({
              path: `/internal/security/user_profile/_data`,
              method: 'POST',
              headers: {
                Cookie: 'sid=' + sidCookie,
              },
              body: { 'solutionNavigationTour:completed': null },
            });
          } catch (e) {
            log.warning(
              `SolutionNavigation.sidenav.tour.reset - could not reset user profile data`,
              e.message
            );
          }

          await browser.refresh();
        },
        ensureHidden: async () => {
          log.debug('SolutionNavigation.sidenav.tour.ensureHidden');
          await browser.setLocalStorageItem('solutionNavigationTour:completed', 'true');
          await browser.refresh();
        },
        isTourStepVisible: async (stepId: TourStepId) => {
          log.debug('SolutionNavigation.sidenav.tour.isTourStepVisible', stepId);
          return await testSubjects.exists(`nav-tour-step-${stepId}`, { timeout: TIMEOUT_CHECK });
        },
        expectTourStepVisible: async (stepId: TourStepId) => {
          log.debug('SolutionNavigation.sidenav.tour.expectTourStepVisible', stepId);
          await testSubjects.existOrFail(`nav-tour-step-${stepId}`);
        },
        nextStep: async () => {
          log.debug('SolutionNavigation.sidenav.tour.nextStep');
          await testSubjects.click('nav-tour-next-button');
        },
        expectHidden: async () => {
          log.debug('SolutionNavigation.sidenav.tour.expectHidden');
          await testSubjects.missingOrFail('*nav-tour-step');
        },
      },
      feedbackCallout: {
        async disable() {
          await browser.setLocalStorageItem('sideNavigationFeedback', `${Date.now()}`);
          await browser.refresh();
        },
        async reset() {
          await browser.removeLocalStorageItem('sideNavigationFeedback');
          await browser.refresh();
        },
        async getFeedbackTestSubjectId() {
          return 'feedbackSnippetPanel';
        },
        async getFeedbackDismissTestSubjectId() {
          return 'feedbackSnippetPanel > sideNavigationFeedbackPanelDismiss';
        },
        async expectExists() {
          await testSubjects.existOrFail(await this.getFeedbackTestSubjectId(), {
            timeout: TIMEOUT_CHECK,
          });
        },
        async expectMissing() {
          return await testSubjects.existOrFail('sideNavigationFeedbackButtonSurveyLink', {
            timeout: TIMEOUT_CHECK,
          });
        },
        async dismiss() {
          // TODO: find a better way without trying to collapse every time
          // https://github.com/elastic/kibana/issues/236242
          await collapseMoreIfNeeded();
          const feedbackTestSubjectId = await this.getFeedbackTestSubjectId();
          if (await testSubjects.exists(feedbackTestSubjectId, { timeout: TIMEOUT_CHECK })) {
            await testSubjects.click(await this.getFeedbackDismissTestSubjectId());
          }
        },
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
