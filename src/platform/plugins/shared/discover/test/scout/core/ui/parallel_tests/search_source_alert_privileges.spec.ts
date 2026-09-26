/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRole } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { getSearchSourceRuleParams, spaceTest } from '../../../common/ui/fixtures';

spaceTest.describe(
  'Discover app - search source alert privileges',
  { tag: '@local-stateful-classic' },
  () => {
    let sourceIndex = '';
    let dataViewId = '';
    let ruleId = '';
    let ruleName = '';

    spaceTest.beforeAll(async ({ apiServices, esClient, scoutSpace }) => {
      const suffix = `${scoutSpace.id}-${Date.now()}`;
      sourceIndex = `search-source-alert-privileges-${suffix}`;
      ruleName = `search-source-alert-privileges-${suffix}`;
      await esClient.indices.create({
        index: sourceIndex,
        mappings: { properties: { '@timestamp': { type: 'date' }, message: { type: 'keyword' } } },
      });
      await esClient.index({
        index: sourceIndex,
        document: { '@timestamp': new Date().toISOString(), message: 'test message' },
        refresh: 'wait_for',
      });
      const dataView = await apiServices.dataViews.create({
        title: sourceIndex,
        timeFieldName: '@timestamp',
        spaceId: scoutSpace.id,
      });
      dataViewId = dataView.data.id;
      const rule = await apiServices.alerting.rules.create(
        {
          name: ruleName,
          ruleTypeId: '.es-query',
          consumer: 'stackAlerts',
          schedule: { interval: '1m' },
          notifyWhen: 'onActiveAlert',
          params: getSearchSourceRuleParams(dataViewId),
          actions: [],
        },
        scoutSpace.id
      );
      ruleId = rule.data.id as string;
    });

    spaceTest.afterAll(async ({ apiServices, esClient, scoutSpace }) => {
      if (ruleId) {
        await apiServices.alerting.rules.delete(ruleId, scoutSpace.id);
      }
      await apiServices.dataViews.delete(dataViewId, scoutSpace.id);
      await esClient.indices.delete({ index: sourceIndex, ignore_unavailable: true });
    });

    spaceTest(
      "allows a Discover alert user to view a rule's results",
      async ({ browserAuth, page, pageObjects }) => {
        const role: KibanaRole = {
          elasticsearch: {
            cluster: [],
            indices: [
              {
                names: [sourceIndex],
                privileges: ['read', 'view_index_metadata'],
              },
            ],
          },
          kibana: [
            {
              base: [],
              feature: {
                actions: ['all'],
                stackAlerts: ['all'],
                logs: ['all'],
                discover: ['all'],
                advancedSettings: ['all'],
                indexPatterns: ['all'],
              },
              spaces: ['*'],
            },
          ],
        };
        await browserAuth.loginWithCustomRole(role);
        await page.gotoApp(`management/insightsAndAlerting/triggersActions/rule/${ruleId}`);
        await page.testSubj.locator('appHeaderTitle').waitFor({ state: 'visible' });
        await page.testSubj.click('app-menu-overflow-button');
        await page.testSubj.click('ruleDetails-viewInDiscover');
        await pageObjects.discover.waitUntilSearchingHasFinished();
        await pageObjects.dataGrid.waitForDocTableRendered();
        await expect(pageObjects.discover.getSelectedDataView()).toHaveAccessibleName(sourceIndex);
        await expect.poll(() => pageObjects.discover.getHitCountInt()).toBe(1);
      }
    );
  }
);
