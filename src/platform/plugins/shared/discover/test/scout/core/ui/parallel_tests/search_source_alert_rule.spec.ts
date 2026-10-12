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
  getGeneratedContextLink,
  refreshSearchSourceAlertDocuments,
  setupSearchSourceAlertEnvironment,
  spaceTest,
  teardownSearchSourceAlertEnvironment,
  type SearchSourceAlertEnvironment,
} from '../../../common/ui/fixtures';

spaceTest.describe(
  'Discover app - search source alert rule',
  { tag: tags.deploymentAgnostic },
  () => {
    // Generated notification links depend on an asynchronously executed rule and can take up to 90 seconds.
    spaceTest.setTimeout(150_000);

    const createdDataViewIds: string[] = [];
    const createdRuleIds: string[] = [];
    let environment: SearchSourceAlertEnvironment;

    spaceTest.beforeAll(async ({ apiServices, esClient, scoutSpace }) => {
      environment = await setupSearchSourceAlertEnvironment({
        apiServices,
        esClient,
        spaceId: scoutSpace.id,
      });
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
      'should validate the time field and create an alert',
      async ({ apiServices, esClient, page, pageObjects, scoutSpace }) => {
        const { sourceIndex, outputIndex } = environment;
        const { insightsAndAlerting } = pageObjects;
        const alertName = `tmp-rule-${Date.now()}`;
        const noTimeFieldPattern = `${outputIndex}*`;
        await pageObjects.discover.goto({ queryMode: 'classic' });
        await pageObjects.discover.waitUntilSearchingHasFinished();
        await pageObjects.discover.selectDataView(sourceIndex);
        await pageObjects.datePicker.setCommonlyUsedTime('Last_15 minutes');

        await pageObjects.discover.openSearchThresholdRuleFlyout();
        await insightsAndAlerting.defineSearchSourceRule(alertName);

        await spaceTest.step('rejects a data view without a time field', async () => {
          await insightsAndAlerting.exploreMatchingIndices(noTimeFieldPattern);

          await expect(insightsAndAlerting.dataViewExpression).toContainText(noTimeFieldPattern);
          await expect(insightsAndAlerting.expressionError).toHaveText(
            'Data view should have a time field.'
          );
          await insightsAndAlerting.goToRuleFormDetailsStep();
          await page.components.toast().closeAll();
          await expect(insightsAndAlerting.createRuleSaveButton).toBeDisabled();
          await insightsAndAlerting.goToRuleFormDefinitionStep();
        });

        await spaceTest.step('switches to a valid data view and creates the alert', async () => {
          await insightsAndAlerting.selectDataView(sourceIndex);

          await expect(insightsAndAlerting.dataViewExpression).toContainText(sourceIndex);
          await expect(insightsAndAlerting.expressionError).toBeHidden();

          await insightsAndAlerting.goToRuleFormDetailsStep();
          await page.components.toast().closeAll();
          await insightsAndAlerting.saveNewRule();

          await pageObjects.toasts.waitForToastWithText('Created rule');
          const {
            data: { data: createdRules },
          } = await apiServices.alerting.rules.find(
            { search: alertName, search_fields: 'name' },
            scoutSpace.id
          );
          const [createdRule] = createdRules;
          expect(createdRule).toBeDefined();
          createdRuleIds.push(createdRule.id);
          await getGeneratedContextLink(esClient, outputIndex, createdRule.id);
        });
      }
    );

    spaceTest(
      'should preserve snapshot rule state while View in Discover uses updated params',
      async ({ apiServices, esClient, page, pageObjects, scoutSpace }) => {
        const { sourceIndex, outputIndex, connectorId, sourceDataViewId } = environment;
        const ruleName = `updated-rule-state-${scoutSpace.id}-${Date.now()}`;
        const ruleId = await createSearchSourceRule({
          apiServices,
          connectorId,
          dataViewId: sourceDataViewId,
          name: ruleName,
          spaceId: scoutSpace.id,
        });
        createdRuleIds.push(ruleId);

        const contextLink = await getGeneratedContextLink(esClient, outputIndex, ruleId);

        await spaceTest.step('updates the rule through the edit UI', async () => {
          await pageObjects.insightsAndAlerting.openRuleByName(ruleName);
          await pageObjects.insightsAndAlerting.openEditRuleFlyout();
          await pageObjects.queryBar.setQuery('message:msg-1');
          await pageObjects.filterBar.addFilter({
            field: 'message.keyword',
            operator: 'is',
            value: 'msg-1',
          });
          await pageObjects.insightsAndAlerting.setThreshold('1');
          await pageObjects.insightsAndAlerting.saveEditedRule();
        });

        await spaceTest.step(
          'the previous notification link restores original params',
          async () => {
            await page.goto(new URL(contextLink, page.url()).toString());
            await pageObjects.discover.waitUntilSearchingHasFinished();
            await pageObjects.dataGrid.waitForDocTableRendered();

            await pageObjects.toasts.waitForToastWithText('Displayed documents may vary');
            await expectSearchSourceAlertInitialResults(pageObjects, sourceIndex);
          }
        );

        await spaceTest.step('View in Discover uses current params', async () => {
          await pageObjects.insightsAndAlerting.openRuleByName(ruleName);
          await pageObjects.insightsAndAlerting.viewRuleInDiscover();
          await pageObjects.discover.waitUntilSearchingHasFinished();
          await pageObjects.dataGrid.waitForDocTableRendered();

          await expect(page.testSubj.locator('globalToastList')).toBeHidden();
          await expect(pageObjects.discover.getSelectedDataView()).toHaveAccessibleName(
            sourceIndex
          );
          await expectSearchSourceAlertUpdatedResults(pageObjects, sourceDataViewId);
        });
      }
    );

    spaceTest(
      'should display results after rule removal on following generated link',
      async ({ apiServices, esClient, page, pageObjects, scoutSpace }) => {
        const { sourceIndex, outputIndex, connectorId } = environment;
        const uniqueSuffix = `${scoutSpace.id}-${Date.now()}`;
        const dataViewTitle = `search-source-alert-deleted-rule-${uniqueSuffix}`;
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

        const ruleId = await createSearchSourceRule({
          apiServices,
          connectorId,
          dataViewId,
          name: `deleted-rule-snapshot-${uniqueSuffix}`,
          spaceId: scoutSpace.id,
        });
        createdRuleIds.push(ruleId);

        const contextLink = await getGeneratedContextLink(esClient, outputIndex, ruleId);
        await apiServices.alerting.rules.delete(ruleId, scoutSpace.id);

        await page.goto(new URL(contextLink, page.url()).toString());
        await pageObjects.discover.waitUntilSearchingHasFinished();
        await pageObjects.dataGrid.waitForDocTableRendered();

        await pageObjects.toasts.waitForToastWithText('Displayed documents may vary');
        await expectSearchSourceAlertInitialResults(pageObjects, dataViewTitle);
        await expect
          .poll(async () =>
            (await pageObjects.unifiedFieldList.getAllFieldNames()).includes('message')
          )
          .toBe(true);
      }
    );
  }
);
