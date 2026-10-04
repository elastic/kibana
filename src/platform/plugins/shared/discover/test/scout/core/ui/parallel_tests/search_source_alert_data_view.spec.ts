/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  createSearchSourceRule,
  expectSearchSourceAlertInitialResults,
  expectSearchSourceAlertUpdatedResults,
  getAdHocDataViewSpec,
  getGeneratedContextLink,
  getUpdatedSearchSourceRuleParams,
  refreshSearchSourceAlertDocuments,
  setupSearchSourceAlertEnvironment,
  spaceTest,
  teardownSearchSourceAlertEnvironment,
  type SearchSourceAlertEnvironment,
} from '../../../common/ui/fixtures';

spaceTest.describe(
  'Discover app - search source alert data view',
  { tag: tags.deploymentAgnostic },
  () => {
    // Generated notification links depend on an asynchronously executed rule and can take up to 90 seconds.
    spaceTest.setTimeout(150_000);

    const createdDataViewIds: string[] = [];
    const createdRuleIds: string[] = [];
    let environment: SearchSourceAlertEnvironment;
    let otherDataView = '';

    spaceTest.beforeAll(async ({ apiServices, esClient, scoutSpace }) => {
      environment = await setupSearchSourceAlertEnvironment({
        apiServices,
        esClient,
        spaceId: scoutSpace.id,
      });
      otherDataView = `${environment.sourceIndex}*`;
      const {
        data: { id: otherDataViewId },
      } = await apiServices.dataViews.create({
        title: otherDataView,
        timeFieldName: '@timestamp',
        spaceId: scoutSpace.id,
      });
      createdDataViewIds.push(otherDataViewId);
    });

    spaceTest.beforeEach(async ({ browserAuth, esClient }) => {
      await browserAuth.loginAsAdmin();
      await refreshSearchSourceAlertDocuments(esClient, environment.sourceIndex);
    });

    spaceTest.afterAll(async ({ apiServices, esClient, scoutSpace }) => {
      if (!environment) {
        return;
      }
      await teardownSearchSourceAlertEnvironment({
        apiServices,
        esClient,
        scoutSpace,
        environment,
        ruleIds: createdRuleIds,
        dataViewIds: createdDataViewIds,
      });
    });

    spaceTest(
      'should not overwrite current data view with alert data view when starting or saving a Discover session',
      async ({ apiServices, page, pageObjects, scoutSpace }) => {
        const { sourceIndex, connectorId, sourceDataViewId } = environment;
        const ruleName = `session-data-view-${scoutSpace.id}-${Date.now()}`;
        const ruleId = await createSearchSourceRule({
          apiServices,
          connectorId,
          dataViewId: sourceDataViewId,
          name: ruleName,
          spaceId: scoutSpace.id,
        });
        createdRuleIds.push(ruleId);

        const openRuleInDiscover = async () => {
          await pageObjects.insightsAndAlerting.openRuleByName(ruleName);
          await pageObjects.insightsAndAlerting.viewRuleInDiscover();
          await pageObjects.discover.waitUntilSearchingHasFinished();
          await pageObjects.dataGrid.waitForDocTableRendered();
        };

        await openRuleInDiscover();

        await expect(page.testSubj.locator('globalToastList')).toBeHidden();
        await expectSearchSourceAlertInitialResults(pageObjects, sourceIndex);
        expect(await pageObjects.discover.getCurrentDataViewId()).toBe(sourceDataViewId);

        await pageObjects.discover.selectDataView(otherDataView);
        await pageObjects.discover.clickNewSearch();

        expect(await pageObjects.discover.getSelectedDataViewName()).toBe(otherDataView);

        await openRuleInDiscover();
        await pageObjects.discover.selectDataView(otherDataView);
        await pageObjects.discover.saveSearch(
          `search-source-alert-session-${scoutSpace.id}-${Date.now()}`
        );

        expect(await pageObjects.discover.getSelectedDataViewName()).toBe(otherDataView);
      }
    );

    spaceTest(
      'should preserve snapshot data view state while View in Discover uses current state',
      async ({ apiServices, esClient, page, pageObjects, scoutSpace }) => {
        const { sourceIndex, outputIndex, connectorId } = environment;
        const uniqueSuffix = `${scoutSpace.id}-${Date.now()}`;
        const initialDataViewTitle = `search-source-alert-original-${uniqueSuffix}`;
        const updatedDataViewTitle = `search-source-alert-updated-${uniqueSuffix}`;
        await esClient.indices.updateAliases({
          actions: [
            { add: { index: sourceIndex, alias: initialDataViewTitle } },
            { add: { index: sourceIndex, alias: updatedDataViewTitle } },
          ],
        });

        const dataViewResponse = await apiServices.dataViews.create({
          title: initialDataViewTitle,
          timeFieldName: '@timestamp',
          spaceId: scoutSpace.id,
        });
        const dataViewId = dataViewResponse.data.id;
        createdDataViewIds.push(dataViewId);

        const ruleName = `updated-data-view-state-${uniqueSuffix}`;
        const ruleId = await createSearchSourceRule({
          apiServices,
          connectorId,
          dataViewId,
          name: ruleName,
          spaceId: scoutSpace.id,
        });
        createdRuleIds.push(ruleId);

        const contextLink = await getGeneratedContextLink(esClient, outputIndex, ruleId);

        await apiServices.alerting.rules.update(
          ruleId,
          {
            params: getUpdatedSearchSourceRuleParams(dataViewId),
          },
          scoutSpace.id
        );
        await apiServices.dataViews.update(dataViewId, {
          title: updatedDataViewTitle,
          sourceFilters: [{ value: 'message' }],
          spaceId: scoutSpace.id,
        });

        await spaceTest.step('the previous notification link restores original state', async () => {
          await page.goto(new URL(contextLink, page.url()).toString());
          // The toast is shown on mount and auto-dismisses, so assert it before waiting on the fetch.
          await pageObjects.toasts.waitForToastWithText('Displayed documents may vary');
          await pageObjects.discover.waitUntilSearchingHasFinished();
          await pageObjects.dataGrid.waitForDocTableRendered();
          await expectSearchSourceAlertInitialResults(pageObjects, initialDataViewTitle);
          await expect
            .poll(async () =>
              (await pageObjects.unifiedFieldList.getAllFieldNames()).includes('message')
            )
            .toBe(true);
        });

        await spaceTest.step('View in Discover uses current state', async () => {
          await pageObjects.insightsAndAlerting.openRuleByName(ruleName);
          await pageObjects.insightsAndAlerting.viewRuleInDiscover();
          await pageObjects.discover.waitUntilSearchingHasFinished();
          await pageObjects.dataGrid.waitForDocTableRendered();

          await expect(page.testSubj.locator('globalToastList')).toBeHidden();
          await expectSearchSourceAlertUpdatedResults(pageObjects, dataViewId);
          await expect
            .poll(async () =>
              (await pageObjects.unifiedFieldList.getAllFieldNames()).includes('message')
            )
            .toBe(false);

          await pageObjects.discover.getSelectedDataView().click();
          await page.testSubj.locator('indexPattern-switcher').waitFor({ state: 'visible' });
          await page.testSubj.click('indexPattern-manage-field');
          await page.testSubj.locator('indexPatternEditorFlyout').waitFor({ state: 'visible' });
          await expect(page.testSubj.locator('createIndexPatternTitleInput')).toHaveValue(
            updatedDataViewTitle
          );
        });
      }
    );

    spaceTest(
      'should navigate to ad-hoc alert results via snapshot and current links',
      async ({ apiServices, esClient, page, pageObjects, scoutSpace }) => {
        const { sourceIndex, outputIndex, connectorId } = environment;
        const uniqueSuffix = `${scoutSpace.id}-${Date.now()}`;
        const adHocDataViewId = `search-source-adhoc-${uniqueSuffix}`;
        const ruleName = `adhoc-data-view-${uniqueSuffix}`;
        const ruleId = await createSearchSourceRule({
          apiServices,
          connectorId,
          dataViewId: adHocDataViewId,
          name: ruleName,
          searchConfigurationIndex: getAdHocDataViewSpec(adHocDataViewId, sourceIndex),
          spaceId: scoutSpace.id,
        });
        createdRuleIds.push(ruleId);

        const contextLink = await getGeneratedContextLink(esClient, outputIndex, ruleId);

        const assertAdHocResults = async () => {
          await expect(pageObjects.discover.getSelectedDataView()).toHaveAccessibleName(
            sourceIndex
          );
          await expect.poll(() => pageObjects.discover.getHitCountInt()).toBe(5);
          await expect(pageObjects.dataGrid.getCell(0, '_source')).toContainText(
            'runtime-message-field'
          );
          await expect(pageObjects.dataGrid.getCell(0, '_source')).toContainText('mock-message');
        };

        await spaceTest.step('opens snapshot results from the notification link', async () => {
          await page.goto(new URL(contextLink, page.url()).toString());
          await pageObjects.discover.waitUntilSearchingHasFinished();
          await pageObjects.dataGrid.waitForDocTableRendered();
          await assertAdHocResults();
        });

        await spaceTest.step('opens current results from View in Discover', async () => {
          await pageObjects.insightsAndAlerting.openRuleByName(ruleName);
          await pageObjects.insightsAndAlerting.viewRuleInDiscover();
          await pageObjects.discover.waitUntilSearchingHasFinished();
          await pageObjects.dataGrid.waitForDocTableRendered();

          await expect(page.testSubj.locator('globalToastList')).toBeHidden();
          await assertAdHocResults();
        });
      }
    );

    spaceTest(
      'should preserve snapshot results but reject current results after data view removal',
      async ({ apiServices, esClient, page, pageObjects, scoutSpace }) => {
        const { sourceIndex, outputIndex, connectorId } = environment;
        const uniqueSuffix = `${scoutSpace.id}-${Date.now()}`;
        const dataViewTitle = `search-source-alert-deleted-${uniqueSuffix}`;
        await esClient.indices.putAlias({
          index: sourceIndex,
          name: dataViewTitle,
        });

        const dataViewResponse = await apiServices.dataViews.create({
          title: dataViewTitle,
          timeFieldName: '@timestamp',
          spaceId: scoutSpace.id,
        });
        const dataViewId = dataViewResponse.data.id;
        createdDataViewIds.push(dataViewId);

        const ruleName = `deleted-data-view-${uniqueSuffix}`;
        const ruleId = await createSearchSourceRule({
          apiServices,
          connectorId,
          dataViewId,
          name: ruleName,
          spaceId: scoutSpace.id,
        });
        createdRuleIds.push(ruleId);

        const contextLink = await getGeneratedContextLink(esClient, outputIndex, ruleId);
        await apiServices.dataViews.delete(dataViewId, scoutSpace.id);

        await spaceTest.step('the previous notification link still renders results', async () => {
          await page.goto(new URL(contextLink, page.url()).toString());
          // The toast is shown on mount and auto-dismisses, so assert it before waiting on the fetch.
          await pageObjects.toasts.waitForToastWithText('Displayed documents may vary');
          await pageObjects.discover.waitUntilSearchingHasFinished();
          await pageObjects.dataGrid.waitForDocTableRendered();
          await expectSearchSourceAlertInitialResults(pageObjects, dataViewTitle);
          await expect
            .poll(async () =>
              (await pageObjects.unifiedFieldList.getAllFieldNames()).includes('message')
            )
            .toBe(true);
        });

        await spaceTest.step('View in Discover reports the missing data view', async () => {
          await pageObjects.insightsAndAlerting.openRuleByName(ruleName);
          await pageObjects.insightsAndAlerting.viewRuleInDiscover();

          await pageObjects.toasts.waitForToastWithText(
            `Could not locate that data view (id: ${dataViewId}), click here to re-create it`
          );
          await expect(page.testSubj.locator('docTable')).toBeHidden();
        });
      }
    );
  }
);
