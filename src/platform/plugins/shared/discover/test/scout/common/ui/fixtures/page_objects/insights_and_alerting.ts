/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator, ScoutPage } from '@kbn/scout';
import { KibanaCodeEditorWrapper } from '@kbn/scout';

const RULES_LIST_APP_PATH = 'management/insightsAndAlerting/triggersActions/rules';
const RULE_DETAILS_APP_PATH = 'management/insightsAndAlerting/triggersActions/rule';

const INDEX_CONNECTOR_DOCUMENT = `{
    "rule_id": "{{rule.id}}",
    "rule_name": "{{rule.name}}",
    "alert_id": "{{alert.id}}",
    "context_link": "{{context.link}}"
  }`;

/**
 * Page object for the Stack Management > Rules pages and the rule form flyout
 * used by the Discover search source alert suites.
 */
export class InsightsAndAlerting {
  readonly rulesList: Locator;
  readonly ruleForm: Locator;
  readonly dataViewExpression: Locator;
  readonly expressionError: Locator;
  readonly createRuleSaveButton: Locator;

  constructor(private readonly page: ScoutPage) {
    this.rulesList = page.testSubj.locator('rulesList');
    this.ruleForm = page.testSubj.locator('ruleForm');
    this.dataViewExpression = page.testSubj.locator('selectDataViewExpression');
    this.expressionError = page.testSubj.locator('esQueryAlertExpressionError');
    this.createRuleSaveButton = page.testSubj.locator('ruleFlyoutFooterSaveButton');
  }

  async gotoRulesList(): Promise<void> {
    await this.page.gotoApp(RULES_LIST_APP_PATH);
    await this.rulesList.waitFor({ state: 'visible' });
  }

  async gotoRuleDetails(ruleId: string): Promise<void> {
    await this.page.gotoApp(`${RULE_DETAILS_APP_PATH}/${ruleId}`);
    await this.page.testSubj.locator('appHeaderTitle').waitFor({ state: 'visible' });
  }

  async openRuleByName(ruleName: string): Promise<void> {
    await this.gotoRulesList();
    await this.rulesList.locator(`[data-test-subj="rulesListTableRowName-${ruleName}"]`).click();
  }

  /** Clicks "View in Discover" from the rule details page overflow menu. */
  async viewRuleInDiscover(): Promise<void> {
    await this.page.testSubj.click('app-menu-overflow-button');
    await this.page.testSubj.click('ruleDetails-viewInDiscover');
  }

  async openEditRuleFlyout(): Promise<void> {
    await this.page.testSubj.click('app-menu-overflow-button');
    await this.page.testSubj.click('openEditRuleFlyoutButton');
    await this.ruleForm.waitFor({ state: 'visible' });
  }

  async saveEditedRule(): Promise<void> {
    await this.page.testSubj.click('rulePageFooterSaveButton');
    await this.ruleForm.waitFor({ state: 'hidden' });
  }

  async setThreshold(value: string): Promise<void> {
    await this.page.testSubj.click('thresholdPopover');
    await this.page.testSubj.fill('alertThresholdInput0', value);
  }

  async setTimeWindowSize(value: string): Promise<void> {
    await this.page.testSubj.click('forLastExpression');
    await this.page.testSubj.fill('timeWindowSizeNumber', value);
  }

  async goToRuleFormDefinitionStep(): Promise<void> {
    await this.page.testSubj.click('ruleFormStep-definition');
  }

  async goToRuleFormActionsStep(): Promise<void> {
    await this.page.testSubj.click('ruleFormStep-actions');
  }

  async goToRuleFormDetailsStep(): Promise<void> {
    await this.page.testSubj.click('ruleFormStep-details');
  }

  async setRuleName(name: string): Promise<void> {
    await this.goToRuleFormDetailsStep();
    await this.page.testSubj.fill('ruleDetailsNameInput', name);
  }

  /** Adds an index connector action that writes the rule id, name, alert id and context link. */
  async addIndexConnectorAction(): Promise<void> {
    await this.goToRuleFormActionsStep();
    const addActionButton = this.page.testSubj.locator('ruleActionsAddActionButton');
    await addActionButton.waitFor({ state: 'visible' });
    await addActionButton.click();

    await this.page.locator('[data-action-type-id=".index"]').click();
    await this.page.testSubj.locator('ruleActionsItem').waitFor({ state: 'visible' });

    await this.page.testSubj
      .locator('kibanaCodeEditor')
      .locator('textarea')
      .waitFor({ state: 'visible' });
    await new KibanaCodeEditorWrapper(this.page).setCodeEditorValue(INDEX_CONNECTOR_DOCUMENT);
  }

  /**
   * Fills the search source rule form with a threshold, time window, index
   * connector action and name, leaving the flyout on the definition step.
   */
  async defineSearchSourceRule(ruleName: string): Promise<void> {
    await this.setThreshold('1');
    await this.setTimeWindowSize('30');
    await this.addIndexConnectorAction();
    await this.setRuleName(ruleName);
    await this.goToRuleFormDefinitionStep();
  }

  /** Types an index pattern in the rule form data view picker and explores its matching indices. */
  async exploreMatchingIndices(indexPattern: string): Promise<void> {
    await this.dataViewExpression.click();
    const searchInput = this.page.testSubj.locator('indexPattern-switcher--input');
    await searchInput.waitFor({ state: 'visible' });
    await searchInput.fill(indexPattern);
    await this.page.testSubj.click('explore-matching-indices-button');
  }

  async selectDataView(dataViewTitle: string): Promise<void> {
    await this.dataViewExpression.click();
    const dataViewSwitcher = this.page.testSubj.locator('indexPattern-switcher');
    await dataViewSwitcher.waitFor({ state: 'visible' });
    await this.page.testSubj.locator('indexPattern-switcher--input').fill('');
    await dataViewSwitcher.locator(`[data-test-subj="dataView-${dataViewTitle}"]`).click();
  }

  async saveNewRule(): Promise<void> {
    await this.createRuleSaveButton.click();
    await this.createRuleSaveButton.waitFor({ state: 'hidden' });
  }
}
