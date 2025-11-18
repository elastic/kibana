/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutSession } from '../session';

/**
 * Get console logs from current session
 */
export async function scoutGetConsoleLogs(
  session: ScoutSession,
  params: { level?: 'error' | 'warn' | 'info' | 'debug' | 'all' } = {}
) {
  try {
    const { level = 'all' } = params;
    const consoleLogs = session.getConsoleLogs();

    const filteredLogs =
      level === 'all' ? consoleLogs : consoleLogs.filter((log) => log.type === level);

    return {
      success: true,
      data: {
        logs: filteredLogs,
        totalCount: consoleLogs.length,
        filteredCount: filteredLogs.length,
      },
      message: `Retrieved ${filteredLogs.length} console logs${
        level !== 'all' ? ` (level: ${level})` : ''
      }`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Get network activity from current session
 */
export async function scoutGetNetworkActivity(
  session: ScoutSession,
  params: { filter?: string; limit?: number } = {}
) {
  try {
    const { filter, limit = 20 } = params;
    const networkActivity = session.getNetworkActivity();

    let filteredActivity = networkActivity;

    if (filter) {
      filteredActivity = networkActivity.filter((activity) =>
        activity.url.toLowerCase().includes(filter.toLowerCase())
      );
    }

    const limitedActivity = filteredActivity.slice(0, limit);

    return {
      success: true,
      data: {
        activity: limitedActivity,
        totalCount: networkActivity.length,
        filteredCount: filteredActivity.length,
      },
      message: `Retrieved ${limitedActivity.length} network requests${
        filter ? ` matching "${filter}"` : ''
      }`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Compare expected snapshot to current page state
 */
export async function scoutCompareSnapshots(
  session: ScoutSession,
  params: { expectedSnapshot: string }
) {
  try {
    const page = await session.getPage();
    if (!page) {
      return {
        success: false,
        error: 'No active page session',
      };
    }

    // Get current snapshot
    const currentSnapshot = await page.accessibility.snapshot();

    // Simple text-based comparison
    const currentText = JSON.stringify(currentSnapshot, null, 2);
    const expectedText = params.expectedSnapshot;

    const differences: string[] = [];

    // Find major differences
    if (currentText.length !== expectedText.length) {
      differences.push(
        `Snapshot size differs: current ${currentText.length} chars vs expected ${expectedText.length} chars`
      );
    }

    // Check for missing elements
    const expectedLines = expectedText.split('\n');
    const currentLines = currentText.split('\n');

    for (const line of expectedLines) {
      if (!currentLines.includes(line)) {
        differences.push(`Missing in current: ${line.trim()}`);
      }
    }

    return {
      success: true,
      data: {
        matches: differences.length === 0,
        differences,
        currentSnapshot: currentText,
        expectedSnapshot: expectedText,
      },
      message:
        differences.length === 0 ? 'Snapshots match' : `Found ${differences.length} differences`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Suggest fixes for common test failures
 */
export async function scoutSuggestFix(
  session: ScoutSession,
  params: { errorMessage: string; testCode?: string }
) {
  try {
    const { errorMessage, testCode = '' } = params;

    const suggestions: string[] = [];
    const resources: string[] = [];

    // Analyze error type and suggest fixes
    if (errorMessage.toLowerCase().includes('timeout')) {
      suggestions.push('**Timeout Error Detected**');
      suggestions.push('');
      suggestions.push('Common causes and fixes:');
      suggestions.push('1. Element not found - Check selector is correct');
      suggestions.push('2. Element not visible - Wait for element to be visible');
      suggestions.push('3. Slow operation - Increase timeout or use proper wait strategy');
      suggestions.push('');
      suggestions.push('**Suggested fixes:**');
      suggestions.push('```typescript');
      suggestions.push('// Use proper wait with timeout');
      suggestions.push('await expect(element).toBeVisible({ timeout: 30000 });');
      suggestions.push('');
      suggestions.push('// Or wait for element state');
      suggestions.push('await element.waitFor({ state: "visible", timeout: 30000 });');
      suggestions.push('```');
      resources.push('scout://patterns/wait-strategies');
    }

    if (errorMessage.toLowerCase().includes('not found') || errorMessage.includes('null')) {
      suggestions.push('**Element Not Found Error**');
      suggestions.push('');
      suggestions.push('Common causes:');
      suggestions.push('1. Incorrect selector');
      suggestions.push('2. Element not yet rendered');
      suggestions.push('3. Element in different frame/context');
      suggestions.push('');
      suggestions.push('**Suggested fixes:**');
      suggestions.push('```typescript');
      suggestions.push('// Check selector format');
      suggestions.push('// ❌ Wrong: page.locator("[data-test-subj=\'button\']")');
      suggestions.push('// ✅ Correct: page.testSubj.locator("button")');
      suggestions.push('');
      suggestions.push('// Wait for element to exist');
      suggestions.push('await page.testSubj.locator("button").waitFor({ state: "attached" });');
      suggestions.push('```');
      resources.push('scout://patterns/page-objects');
    }

    if (errorMessage.toLowerCase().includes('assertion')) {
      suggestions.push('**Assertion Failed**');
      suggestions.push('');
      suggestions.push('The expected condition was not met. Check:');
      suggestions.push('1. Is the expected value correct?');
      suggestions.push('2. Does the element need time to update?');
      suggestions.push('3. Is the test checking the right element?');
      suggestions.push('');
      suggestions.push('**Debug steps:**');
      suggestions.push('```typescript');
      suggestions.push('// Get actual value to compare');
      suggestions.push('const actualText = await element.textContent();');
      suggestions.push('console.log("Actual:", actualText);');
      suggestions.push('console.log("Expected:", expectedText);');
      suggestions.push('');
      suggestions.push('// Take screenshot at failure point');
      suggestions.push('await page.screenshot({ path: "debug.png" });');
      suggestions.push('```');
    }

    if (testCode && testCode.includes('spaceTest') && errorMessage.includes('conflict')) {
      suggestions.push('**Data Conflict in Parallel Tests**');
      suggestions.push('');
      suggestions.push('Make test data unique:');
      suggestions.push('```typescript');
      suggestions.push('// Add scoutSpace.id and timestamp to make unique');
      suggestions.push('const name = `Item_${scoutSpace.id}_${Date.now()}`;');
      suggestions.push('```');
      resources.push('scout://patterns/test-writing');
    }

    if (!suggestions.length) {
      suggestions.push('**General Debugging Steps:**');
      suggestions.push('1. Check console logs: Use scout_get_console_logs');
      suggestions.push('2. Check network activity: Use scout_get_network_activity');
      suggestions.push('3. Take screenshot at failure point');
      suggestions.push('4. Run test in headed mode to observe');
      suggestions.push('5. Add console.log statements to track execution');
      resources.push('scout://patterns/wait-strategies');
      resources.push('scout://patterns/test-writing');
    }

    return {
      success: true,
      data: {
        suggestions: suggestions.join('\n'),
        resources,
        errorType: detectErrorType(errorMessage),
      },
      message: 'Generated fix suggestions for error',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Analyze wait failure and suggest appropriate strategy
 */
export async function scoutAnalyzeWaitFailure(
  session: ScoutSession,
  params: { element?: string; timeout?: number }
) {
  try {
    const page = await session.getPage();
    if (!page) {
      return {
        success: false,
        error: 'No active page session',
      };
    }

    const { element, timeout } = params;

    const analysis = {
      pageLoaded: await page.evaluate(() => document.readyState === 'complete'),
      url: page.url(),
      suggestions: [] as string[],
    };

    if (element) {
      // Try to find the element
      const elementExists = await page.locator(element).count();
      analysis.suggestions.push(
        elementExists > 0
          ? `Element "${element}" exists (${elementExists} found) - may not be visible yet`
          : `Element "${element}" not found in DOM`
      );

      if (elementExists === 0) {
        analysis.suggestions.push('**Suggestions:**');
        analysis.suggestions.push('- Check if selector is correct');
        analysis.suggestions.push('- Element may not have rendered yet - wait for it to appear');
        analysis.suggestions.push('- Check if you are on the correct page');
      } else {
        analysis.suggestions.push('**Suggestions:**');
        analysis.suggestions.push('- Element exists but not visible - wait for visibility');
        analysis.suggestions.push('```typescript');
        analysis.suggestions.push(
          `await page.locator('${element}').waitFor({ state: 'visible', timeout: 30000 });`
        );
        analysis.suggestions.push('```');
      }
    }

    if (!analysis.pageLoaded) {
      analysis.suggestions.push('- Page is still loading - wait for load state');
      analysis.suggestions.push('```typescript');
      analysis.suggestions.push("await page.waitForLoadState('networkidle');");
      analysis.suggestions.push('```');
    }

    return {
      success: true,
      data: analysis,
      message: 'Analyzed wait failure',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function detectErrorType(errorMessage: string): string {
  const msg = errorMessage.toLowerCase();
  if (msg.includes('timeout')) return 'timeout';
  if (msg.includes('not found') || msg.includes('null')) return 'element_not_found';
  if (msg.includes('assertion') || msg.includes('expected')) return 'assertion_failed';
  if (msg.includes('network') || msg.includes('request')) return 'network_error';
  if (msg.includes('permission') || msg.includes('auth')) return 'auth_error';
  return 'unknown';
}
