/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutSession } from '../session';
import { generateTestFile } from '../templates';
import { scoutAnalyzeTestSuitability } from './test_analyzer';

/**
 * Generate a Scout test file from current session actions
 */
export async function scoutGenerateTestFile(
  session: ScoutSession,
  params: {
    testName: string;
    description: string;
    deploymentTags?: string[];
    useSpaceTest?: boolean;
  }
) {
  try {
    const { testName, description, deploymentTags = ['@ess'], useSpaceTest = true } = params;

    // First, analyze if this test should be E2E
    const suitabilityAnalysis = await scoutAnalyzeTestSuitability({
      testDescription: description,
      context: 'new_test_generation',
    });

    // Get action history from session
    const actionHistory = session.getActionHistory();

    // Generate setup code from actions
    const setupCode = generateSetupCode(actionHistory);

    // Generate test code from actions
    const testCode = generateTestCode(actionHistory);

    // Generate cleanup code
    const cleanupCode = generateCleanupCode(actionHistory);

    // Determine imports based on actions
    const imports: string[] = [];
    const fixtures: string[] = ['page', 'pageObjects'];

    if (useSpaceTest) {
      fixtures.push('scoutSpace');
    }

    // Check if API services are needed
    if (actionHistory.some((a) => a.type === 'api_call')) {
      fixtures.push('apiServices');
    }

    // Check if browser auth is needed
    if (actionHistory.some((a) => a.type === 'navigation')) {
      fixtures.push('browserAuth');
    }

    const testFileCode = generateTestFile({
      testName,
      description,
      deploymentTags,
      useSpaceTest,
      imports,
      fixtures,
      setupCode,
      testCode,
      cleanupCode,
    });

    // Add warning if test might not be suitable for E2E
    let warning;
    if (suitabilityAnalysis.success && suitabilityAnalysis.data.recommendedType !== 'e2e') {
      warning = {
        message: `⚠️ This test might be better as a ${suitabilityAnalysis.data.recommendedType} test`,
        confidence: suitabilityAnalysis.data.confidence,
        reasoning: suitabilityAnalysis.data.reasoning,
        alternatives: suitabilityAnalysis.data.alternativeApproaches,
        estimatedSpeed: suitabilityAnalysis.data.estimatedSpeed,
        examples: suitabilityAnalysis.data.examples,
      };
    }

    return {
      success: true,
      data: {
        testCode: testFileCode,
        suitabilityAnalysis: suitabilityAnalysis.success ? suitabilityAnalysis.data : null,
        warning,
      },
      message: warning
        ? `⚠️ Warning: ${warning.message}. Test file generated, but consider ${suitabilityAnalysis.data.recommendedType} test instead.`
        : `Generated Scout test file for "${testName}"`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Suggest assertions based on current page state
 */
export async function scoutSuggestAssertions(session: ScoutSession) {
  try {
    const page = await session.getPage();
    if (!page) {
      return {
        success: false,
        error: 'No active page session',
      };
    }

    // Get ARIA snapshot to analyze page state
    const snapshot = await page.accessibility.snapshot();

    const suggestions: string[] = [];

    if (snapshot) {
      // Analyze visible elements and suggest assertions
      const analyzeNode = (node: any, depth: number = 0) => {
        if (depth > 3) return; // Limit depth

        if (node.name) {
          // Suggest visibility assertion
          suggestions.push(
            `await expect(page.getByRole('${node.role}', { name: '${node.name}' })).toBeVisible();`
          );
        }

        if (node.value) {
          suggestions.push(
            `await expect(page.getByRole('${node.role}')).toHaveValue('${node.value}');`
          );
        }

        if (node.children) {
          node.children.forEach((child: any) => analyzeNode(child, depth + 1));
        }
      };

      analyzeNode(snapshot);
    }

    return {
      success: true,
      data: {
        suggestions: suggestions.slice(0, 10), // Limit to top 10 suggestions
        count: suggestions.length,
      },
      message: `Found ${suggestions.length} assertion suggestions`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Find all available testSubj selectors on current page
 */
export async function scoutFindSelectors(session: ScoutSession, params: { filter?: string } = {}) {
  try {
    const page = await session.getPage();
    if (!page) {
      return {
        success: false,
        error: 'No active page session',
      };
    }

    // Find all elements with data-test-subj attribute
    const selectors = await page.evaluate(() => {
      const elements = document.querySelectorAll('[data-test-subj]');
      return Array.from(elements).map((el) => ({
        testSubj: el.getAttribute('data-test-subj') || '',
        tagName: el.tagName.toLowerCase(),
        text: el.textContent?.slice(0, 100) || '',
        visible: el.checkVisibility(),
      }));
    });

    // Filter if requested
    const filteredSelectors = params.filter
      ? selectors.filter(
          (s) =>
            s.testSubj.toLowerCase().includes(params.filter!.toLowerCase()) ||
            s.text.toLowerCase().includes(params.filter!.toLowerCase())
        )
      : selectors;

    return {
      success: true,
      data: {
        selectors: filteredSelectors,
        totalCount: selectors.length,
        filteredCount: filteredSelectors.length,
      },
      message: `Found ${filteredSelectors.length} testSubj selectors${
        params.filter ? ` matching "${params.filter}"` : ''
      }`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Helper functions

function generateSetupCode(actions: any[]): string {
  const setupLines: string[] = [];

  // Check if we need authentication
  if (actions.some((a) => a.type === 'navigation')) {
    setupLines.push('await browserAuth.loginAsAdmin();');
  }

  // Check if we need to clean up data
  if (actions.some((a) => a.type === 'api_call')) {
    setupLines.push('// Clean up existing data');
    setupLines.push('await apiServices.yourService.deleteAll();');
  }

  return setupLines.join('\n    ');
}

function generateTestCode(actions: any[]): string {
  const testLines: string[] = [];

  for (const action of actions) {
    switch (action.type) {
      case 'navigation':
        testLines.push(`await page.gotoApp('${action.app}');`);
        break;
      case 'click':
        if (action.testSubj) {
          testLines.push(`await page.testSubj.click('${action.testSubj}');`);
        }
        break;
      case 'type':
        if (action.testSubj && action.text) {
          testLines.push(
            `await page.testSubj.locator('${action.testSubj}').fill('${action.text}');`
          );
        }
        break;
      case 'wait':
        if (action.testSubj) {
          testLines.push(
            `await expect(page.testSubj.locator('${action.testSubj}')).toBeVisible();`
          );
        }
        break;
    }
  }

  return testLines.join('\n    ');
}

function generateCleanupCode(actions: any[]): string {
  const cleanupLines: string[] = [];

  if (actions.some((a) => a.type === 'api_call')) {
    cleanupLines.push('await apiServices.yourService.deleteAll();');
  }

  return cleanupLines.join('\n    ');
}
