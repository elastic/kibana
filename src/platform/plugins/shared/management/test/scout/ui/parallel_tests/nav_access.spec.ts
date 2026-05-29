/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Stack Management nav link visibility and Kibana-privilege-driven sidebar sections.

import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';
import { test, CUSTOM_ROLES } from '../fixtures';

test.describe('Stack Management — nav link access', { tag: tags.stateful.classic }, () => {
  // Pre-migration tag 'skipFIPS'
  test('kibana_admin sees the nav link and only Kibana-privilege-driven sections', async ({
    browserAuth,
    pageObjects,
  }) => {
    await browserAuth.loginWithCustomRole(CUSTOM_ROLES.kibana_admin);

    await test.step('navigate to management and assert nav link + sidebar', async () => {
      await pageObjects.management.goto();
      const navLinks = await pageObjects.collapsibleNav.getNavLinks();
      expect(navLinks).toContain('Stack Management');

      const sections = await pageObjects.management.readSidebarSections();
      expect(sections).toHaveLength(7);
      const dataSection = sections.find((s) => s.sectionId === 'data');
      expect(dataSection?.sectionLinks).toStrictEqual(['data_quality', 'content_connectors']);
      const insightsSection = sections.find((s) => s.sectionId === 'insightsAndAlerting');
      expect(insightsSection?.sectionLinks).toStrictEqual([
        'triggersActionsAlerts',
        'triggersActions',
        'cases',
        'triggersActionsConnectors',
        'reporting',
        'maintenanceWindows',
      ]);
      const clusterPerfSection = sections.find((s) => s.sectionId === 'clusterPerformance');
      expect(clusterPerfSection?.sectionLinks).toStrictEqual(['queryActivity']);
      const modelMgmtSection = sections.find((s) => s.sectionId === 'modelManagement');
      expect(modelMgmtSection?.sectionLinks).toStrictEqual([
        'elastic_inference_service',
        'inference_endpoints',
        'model_settings',
      ]);
      const kibanaSection = sections.find((s) => s.sectionId === 'kibana');
      expect(kibanaSection?.sectionLinks).toStrictEqual([
        'dataViews',
        'filesManagement',
        'objects',
        'tags',
        'search_sessions',
        'spaces',
        'settings',
      ]);
    });
  });

  test('no management privileges — Stack Management nav link is absent and app is inaccessible', async ({
    browserAuth,
    page,
    pageObjects,
  }) => {
    await browserAuth.loginWithCustomRole(CUSTOM_ROLES.global_dashboard_read);

    await test.step('Stack Management nav link is not visible', async () => {
      await page.gotoApp('dashboards');
      const navLinks = await pageObjects.collapsibleNav.getNavLinks();
      expect(navLinks).not.toContain('Stack Management');
    });

    await test.step('navigating to management directly shows app-not-found', async () => {
      await pageObjects.management.gotoExpectAppNotFound();
      await expect(pageObjects.management.appNotFoundContent).toBeVisible();
    });
  });
});
