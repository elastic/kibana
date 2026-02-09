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
      'wf-yaml-editor-validation-errors-list'
    );
  }

  /**
   * Navigate to the workflow editor for a new workflow
   */
  async gotoNewWorkflow() {
    await this.page.gotoApp('workflows');
    await this.page.testSubj.click('createWorkflowButton');
    await this.waitForEditorToLoad();
  }

  /**
   * Navigate to the workflow editor for an existing workflow by ID
   */
  async gotoWorkflow(workflowId: string) {
    await this.page.gotoApp('workflows', { hash: workflowId });
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
   * Click the run button (opens execute modal)
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
   * Execute the workflow from the execute modal
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
    await this.page.testSubj.waitForSelector('testStepModal', { state: 'visible' });
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
    // The test step modal has a second editor, so we need to use index 1
  }

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
   * This mirrors the FTR helper that finds `.cdr.squiggly-error` elements,
   * but exposes a Playwright `Locator` so callers can assert on count, text, etc.
   *
   * @param testSubjId - `data-test-subj` of the editor container.
   *   Defaults to `'kibanaCodeEditor'`.
   * @returns A Playwright `Locator` for the current error markers.
   */
  getCurrentMarkers(testSubjId: string = 'kibanaCodeEditor'): Locator {
    const selector = `[data-test-subj="${testSubjId}"] .cdr.squiggly-error`;
    return this.page.locator(selector);
  }


  /**
   * Expands all collapsed steps in the workflow execution panel tree view.
   * Iterates through collapsed nodes and clicks their expansion arrows until all steps are expanded.
   */
  async expandStepsTree() {
    while (true) {
      const collapsedLocators = await this.page.testSubj
        .locator('workflowExecutionPanel')
        .locator('button[aria-expanded="false"]')
        .all();

      if (!collapsedLocators.length) {
        break;
      }
      await collapsedLocators[0].scrollIntoViewIfNeeded();
      await collapsedLocators[0].locator('.euiTreeView__expansionArrow[role=presentation]').click();
    }
  }
  /**
   * Wait for the workflow execution panel to show the specified status
   * @param status - The execution status to wait for ('completed' or 'failed')
   * @param timeout - The timeout
   */
  async waitForExecutionStatus(status: 'completed' | 'failed', timeout: number) {
    const workflowExecutionPanelLocator = this.page.locator(
      `[data-test-subj="workflowExecutionPanel"][data-execution-status="${status}"]`
    );
    await workflowExecutionPanelLocator.waitFor({ state: 'visible', timeout });
  }

  /**
   * Selects a step in the workflow editor by navigating through a hierarchical path.
   *
   * @param path - The hierarchical path to the step, using '>' as separator (e.g., "Parent > Child > Target Step")
   * @returns A promise that resolves to the locator for the target step button
   * @throws Error if any node in the path is not found
   */
  async getStep(path: string): Promise<Locator> {
    const nodes = path.split('>').map((substring) => substring.trim());
    const workflowExecutionPanelLocator = this.page.testSubj.locator('workflowExecutionPanel');
    let parentLocator = workflowExecutionPanelLocator.locator(
      'ul[aria-label="Workflow step execution tree"]'
    );

    for (let i = 0; i < nodes.length; i++) {
      const currentNode = nodes[i];
      const allListItems = await parentLocator.locator('> li').all();
      let found = false;

      for (const listItem of allListItems) {
        const buttonLocator = listItem.locator('> button');
        const buttonText = await buttonLocator
          .locator('span[data-test-subj="stepName"]')
          .textContent();

        if (buttonText?.trim() === currentNode) {
          found = true;

          // If this is the last node in the path, return the button
          if (i === nodes.length - 1) {
            return buttonLocator;
          }

          // Otherwise, navigate deeper into the tree
          parentLocator = listItem.locator('> div > ul');
          break;
        }
      }

      if (!found) {
        throw new Error(
          `Step not found: "${currentNode}" in path "${path}" (failed at level ${i + 1})`
        );
      }
    }

    // This should never be reached due to the return in the loop
    throw new Error(`Failed to navigate step path: ${path}`);
  }

  async getStepOutputJson<TOutput = unknown>(): Promise<TOutput> {
    const workflowStepExecutionDetails = this.page.testSubj.locator('workflowStepExecutionDetails');
    await workflowStepExecutionDetails.locator('button[data-test-subj="json"]').click();
    const jsonEditorNthIndex = 1; // step output json editor index is 1, magic number, but this is the only way
    const stringValue = await new KibanaCodeEditorWrapper(this.page).getCodeEditorValue(
      jsonEditorNthIndex
    );
    return JSON.parse(stringValue);
  }
}
