/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect, test } from '../fixtures';

test.describe('Workflow Execution', { tag: ['@ess', '@svlSecurity'] }, () => {
  let workflowId: string;

  const simpleWorkflowYaml = `version: '1'
name: Test Workflow
description: Simple test workflow for smoke testing
enabled: true
tags:
  - test
steps:
  - name: log_message
    type: kibana.serverLog
    with:
      message: "Test execution from Scout smoke test"
      level: info
`;

  test.beforeAll(async ({ kbnClient }) => {
    // Enable workflows UI setting
    await kbnClient.request({
      method: 'POST',
      path: '/internal/kibana/settings',
      body: {
        changes: {
          'workflows:ui:enabled': true,
        },
      },
    });

    // Create a simple test workflow
    const response = await kbnClient.request({
      method: 'POST',
      path: '/api/workflows',
      body: {
        name: 'Test Workflow',
        description: 'Simple test workflow for smoke testing',
        enabled: true,
        yaml: simpleWorkflowYaml,
        tags: ['test', 'smoke-test'],
      },
    });

    workflowId = response.data.id;
  });

  test.afterAll(async ({ kbnClient }) => {
    // Clean up the test workflow
    if (workflowId) {
      await kbnClient
        .request({
          method: 'DELETE',
          path: `/api/workflows/${workflowId}`,
        })
        .catch(() => {
          // Ignore errors during cleanup
        });
    }
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test('should create and execute a simple workflow', async ({ page, kbnClient }) => {
    // Navigate to the workflow detail page
    await page.gotoApp(`workflows/${workflowId}`);
    await page.waitForLoadState('networkidle');

    // Verify workflow page loaded
    await expect(page.getByText('Test Workflow')).toBeVisible();

    // Click the Run button
    const runButton = page.getByTestId('workflowRunButton').or(page.getByRole('button', { name: /run/i }));
    await runButton.click();

    // Wait for execution to start
    await page.waitForTimeout(1000);

    // Navigate to executions tab or wait for execution status
    const executionsTab = page.getByTestId('workflowExecutionsTab').or(page.getByRole('tab', { name: /executions/i }));
    
    if (await executionsTab.isVisible().catch(() => false)) {
      await executionsTab.click();
      await page.waitForLoadState('networkidle');
    }

    // Wait for execution to complete (up to 30 seconds)
    let executionCompleted = false;
    for (let i = 0; i < 30; i++) {
      const completedStatus = page.getByText(/completed/i).first();
      if (await completedStatus.isVisible().catch(() => false)) {
        executionCompleted = true;
        break;
      }
      await page.waitForTimeout(1000);
    }

    // Verify execution completed
    expect(executionCompleted).toBe(true);
  });

  test('should display workflow in workflows list', async ({ page }) => {
    await page.gotoApp('workflows');
    await page.waitForLoadState('networkidle');

    // Search or verify the test workflow is in the list
    await expect(page.getByText('Test Workflow')).toBeVisible();
  });
});

