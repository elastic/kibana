/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator, ScoutPage } from '@kbn/scout';
import { PLUGIN_ID } from '../../../../../common';

export class WorkflowEditorPage {
  public yamlEditor: Locator;
  public saveButton: Locator;
  public runButton: Locator;
  public validationErrorsAccordion: Locator;

  constructor(private readonly page: ScoutPage) {
    this.yamlEditor = this.page.testSubj.locator('workflowYamlEditor');
    this.saveButton = this.page.testSubj.locator('saveWorkflowHeaderButton');
    this.runButton = this.page.testSubj.locator('runWorkflowHeaderButton');
    this.validationErrorsAccordion = this.page.testSubj.locator(
      'workflowYamlEditorValidationErrorsList'
    );
  }

  /**
   * Navigate to the workflow editor for a new workflow
   */
  async gotoNewWorkflow() {
    await this.page.gotoApp(PLUGIN_ID);
    await this.page.testSubj.click('createWorkflowButton');
    await this.waitForEditorToLoad();
  }

  /**
   * Navigate to the workflow editor for an existing workflow by ID
   */
  async gotoWorkflow(workflowId: string) {
    await this.page.gotoApp(`${PLUGIN_ID}/${workflowId}`);
    await this.waitForEditorToLoad();
  }

  /**
   * Navigate directly to the executions tab for a workflow.
   */
  async gotoWorkflowExecutions(workflowId: string) {
    await this.page.gotoApp(`${PLUGIN_ID}/${workflowId}`, {
      params: { tab: 'executions' },
    });
    await this.page.testSubj.waitForSelector('workflowExecutionList', { state: 'visible' });
  }

  /**
   * Wait for navigation to the editor page and the YAML editor to be visible.
   * Useful after triggering navigation from an external entry point (e.g. workflow list actions).
   */
  async waitForEditorView() {
    await this.page.waitForURL('**/workflows/*');
    await this.waitForEditorToLoad();
  }

  /**
   * Wait for the YAML editor to be visible and ready
   */
  async waitForEditorToLoad() {
    await this.yamlEditor.waitFor({ state: 'visible' });
  }

  /**
   * Set the value of the main workflow YAML editor
   */
  async setYamlEditorValue(value: string): Promise<void> {
    await this.setEditorValue(this.yamlEditor, value);
  }

  /**
   * Set the value of any Monaco editor by its container locator.
   * Uses the Monaco model API directly for reliable, non-flaky value setting.
   */
  async setEditorValue(editor: Locator, value: string): Promise<void> {
    const uri = await editor.locator('.monaco-editor[data-uri]').getAttribute('data-uri');
    if (!uri) {
      throw new Error('Editor data-uri not found');
    }
    await this.page.evaluate(
      ({ modelUri, editorValue }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- monaco environment is global, but we don't have a type for it
        const monacoEnv = (window as any).MonacoEnvironment;

        if (!monacoEnv?.monaco?.editor) {
          throw new Error('MonacoEnvironment.monaco.editor is not available');
        }
        const editorModel = monacoEnv.monaco.editor.getModel(modelUri);
        if (!editorModel) {
          throw new Error('Editor not found');
        }
        editorModel.setValue(editorValue);
      },
      { modelUri: uri, editorValue: value }
    );
  }

  public getYamlEditorSuggestWidget() {
    return this.page.locator(
      '[data-test-subj="kbnCodeEditorEditorOverflowWidgetsContainer"] .suggest-widget'
    );
  }

  /**
   * Save the workflow
   */
  async saveWorkflow() {
    await this.saveButton.click();
    await this.page.testSubj.waitForSelector('workflowSavedChangesBadge');
  }

  /**
   * Click the run button (opens execute modal or unsaved changes confirmation)
   */
  async clickRunButton() {
    await this.runButton.click();
  }

  /**
   * Run the workflow and confirm if there are unsaved changes
   */
  async runWorkflowWithUnsavedChanges() {
    await this.runButton.click();
    await this.page.testSubj.waitForSelector('runWorkflowWithUnsavedChangesConfirmationModal', {
      state: 'visible',
    });
    await this.page.testSubj.click('confirmModalConfirmButton');
  }

  /**
   * Execute the workflow from the execute modal with the given inputs.
   * Assumes the run button has already been clicked or the execute modal is about to appear.
   */
  async executeWorkflowWithInputs(inputs: Record<string, unknown>) {
    await this.clickRunButton();
    await this.setExecuteModalInputs(inputs);
    await this.page.testSubj.click('executeWorkflowButton');
  }

  /**
   * Wait for the test step modal to be visible
   */
  async waitForTestStepModal() {
    await this.page.testSubj.waitForSelector('workflowTestStepModal', { state: 'visible' });
  }

  /**
   * Set the step inputs in the test step modal
   * @param inputs - The JSON object to set as step inputs
   */
  async setTestStepInputs(inputs: Record<string, unknown>) {
    await this.waitForTestStepModal();
    const stepInputsEditor = this.page.testSubj.locator('workflow-event-json-editor');
    await stepInputsEditor.waitFor({ state: 'visible' });
    await this.setEditorValue(stepInputsEditor, JSON.stringify(inputs, null, 2));
  }

  /**
   * Set the inputs in the execute workflow modal
   */
  async setExecuteModalInputs(inputs: Record<string, unknown>) {
    await this.page.testSubj.waitForSelector('workflowExecuteModal', { state: 'visible' });
    const executeModalInputsEditor = this.page.testSubj.locator('workflow-manual-json-editor');
    await executeModalInputsEditor.waitFor({ state: 'visible' });
    await this.setEditorValue(executeModalInputsEditor, JSON.stringify(inputs, null, 2));
  }

  /**
   * Returns a locator for the current Monaco error markers inside the given
   * editor container.
   *
   * @param testSubjId - `data-test-subj` of the editor container.
   *   Defaults to `'kibanaCodeEditor'`.
   * @returns A Playwright `Locator` for the current error markers.
   */
  getCurrentMarkers(testSubjId: string = 'kibanaCodeEditor'): Locator {
    const selector = `[data-test-subj="${testSubjId}"] .cdr.squiggly-error`;
    return this.page.locator(selector);
  }
}
