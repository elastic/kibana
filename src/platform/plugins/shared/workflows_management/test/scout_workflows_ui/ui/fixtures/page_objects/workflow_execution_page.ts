/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator, ScoutPage } from '@kbn/scout';

/**
 * Page object for the workflow execution detail view.
 *
 * Although editing and execution currently live on the same page,
 * this class isolates execution-specific interactions (step tree,
 * step results, execution status) from editor interactions so tests
 * can express intent clearly and the code is future-proof for when
 * the execution view becomes a separate page.
 */
export class WorkflowExecutionPage {
  public executionPanel: Locator;

  constructor(private readonly page: ScoutPage) {
    this.executionPanel = this.page.testSubj.locator('workflowExecutionPanel');
  }

  /**
   * Wait for the execution view to load (URL contains executionId and panel is visible).
   * Useful after triggering a workflow execution from any entry point.
   */
  async waitForExecutionView() {
    await this.page.waitForURL('**/workflows/*?executionId=*');
    await this.executionPanel.waitFor({ state: 'visible' });
  }

  /**
   * Wait for the workflow execution panel to show the specified status.
   *
   * Automatically waits for the execution view to load first (URL navigation
   * and panel visibility), then polls for the expected status badge.
   *
   * When expecting 'completed', this method also watches for 'failed' status
   * so it can fail fast with a descriptive error (including the step error JSON)
   * instead of timing out with no diagnostic info.
   *
   * @param status - The execution status to wait for ('completed' or 'failed')
   * @param timeout - The timeout in milliseconds
   */
  async waitForExecutionStatus(status: 'completed' | 'failed', timeout: number) {
    await this.waitForExecutionView();
    const withStatus = (s: string) =>
      this.executionPanel.and(this.page.locator(`[data-execution-status="${s}"]`));

    const expectedPanel = withStatus(status);

    if (status === 'completed') {
      const failedPanel = withStatus('failed');

      // Race: wait for either 'completed' or 'failed' — whichever comes first
      const winner = await Promise.race([
        expectedPanel.waitFor({ state: 'visible', timeout }).then(() => 'completed' as const),
        failedPanel.waitFor({ state: 'visible', timeout }).then(() => 'failed' as const),
      ]);

      if (winner === 'failed') {
        const errorDetails = await this.extractFailedStepError();
        throw new Error(
          `Expected execution status "completed" but got "failed".\n\n${errorDetails}`
        );
      }
    } else {
      await expectedPanel.waitFor({ state: 'visible', timeout });
    }
  }

  /**
   * Clicks the last step in the execution tree (typically the failed one)
   * and extracts the error JSON from the step details panel.
   * Returns a formatted string for use in error messages.
   */
  private async extractFailedStepError(): Promise<string> {
    try {
      // Find the last step button in the tree — when execution fails, the last
      // executed step is the one that errored.
      const stepButtons = this.executionPanel.locator(
        'button:has(span[data-test-subj="workflowStepName"])'
      );
      const count = await stepButtons.count();
      if (count === 0) {
        return 'No steps found in execution tree.';
      }

      // eslint-disable-next-line playwright/no-nth-methods -- we need the last step (the failed one)
      const lastStep = stepButtons.nth(count - 1);
      const stepName =
        (await lastStep.locator('span[data-test-subj="workflowStepName"]').textContent()) ??
        'unknown';
      await lastStep.click();

      const errorJson = await this.getStepResultJson<unknown>('error');
      return `Failed step: "${stepName.trim()}"\nError:\n${JSON.stringify(errorJson, null, 2)}`;
    } catch (e) {
      return `(could not extract step error details: ${
        e instanceof Error ? e.message : String(e)
      })`;
    }
  }

  /**
   * Expands all collapsed steps in the workflow execution panel tree view.
   * Iterates through collapsed nodes and clicks their expansion arrows until all steps are expanded.
   */
  async expandStepsTree() {
    while (true) {
      const collapsedLocators = await this.executionPanel
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
   * Selects a step in the execution tree by navigating through a hierarchical path.
   *
   * @param path - The hierarchical path to the step, using '>' as separator
   *   (e.g., "Parent > Child > Target Step" or "loop_over_results > 0 > process-item")
   * @returns A promise that resolves to the locator for the target step button
   * @throws Error if any node in the path is not found
   */
  async getStep(path: string): Promise<Locator> {
    const nodes = path.split('>').map((substring) => substring.trim());
    let parentLocator = this.executionPanel.locator('[data-test-subj="workflowStepExecutionTree"]');

    for (let i = 0; i < nodes.length; i++) {
      const currentNode = nodes[i];
      const allListItems = await parentLocator.locator('> li').all();
      let found = false;

      for (const listItem of allListItems) {
        const buttonLocator = listItem.locator('> button');
        const buttonText = await buttonLocator
          .locator('span[data-test-subj="workflowStepName"]')
          .textContent();

        if (buttonText?.trim() === currentNode) {
          found = true;

          if (i === nodes.length - 1) {
            return buttonLocator;
          }

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

    throw new Error(`Failed to navigate step path: ${path}`);
  }

  /**
   * Retrieves and parses the step result JSON from the workflow step execution details panel.
   *
   * @template TOutput - The expected type of the parsed JSON output
   * @param type - The type of result to retrieve: 'input', 'output', or 'error'
   * @returns A promise that resolves to the parsed JSON result
   */
  async getStepResultJson<TOutput = unknown>(type: 'input' | 'output' | 'error'): Promise<TOutput> {
    const workflowStepExecutionDetails = this.page.testSubj.locator('workflowStepExecutionDetails');

    await workflowStepExecutionDetails
      .locator(`button[data-test-subj="workflowStepTab_${type}"]`)
      .click();
    await workflowStepExecutionDetails
      .locator('button[data-test-subj="workflowViewMode_json"]')
      .click();

    const jsonEditor = this.page.testSubj.locator('workflowStepResultJsonEditor');
    await jsonEditor.waitFor({ state: 'visible' });

    const uri = await jsonEditor.locator('.monaco-editor[data-uri]').getAttribute('data-uri');
    if (!uri) {
      throw new Error('Step result JSON editor data-uri not found');
    }

    const stringValue = await this.page.evaluate((modelUri) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- monaco environment is global, but we don't have a type for it
      const monacoEnv = (window as any).MonacoEnvironment;
      if (!monacoEnv?.monaco?.editor) {
        throw new Error('MonacoEnvironment.monaco.editor is not available');
      }
      const model = monacoEnv.monaco.editor.getModel(modelUri);
      if (!model) {
        throw new Error('Step result JSON editor model not found');
      }
      return model.getValue();
    }, uri);

    return JSON.parse(stringValue);
  }
}
