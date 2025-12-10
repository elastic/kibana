/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ESLint } from 'eslint';
import { REPO_ROOT } from '@kbn/repo-info';
import type { TransformResult } from './types';

/**
 * Post-processes transformed test code by adding headers, comments, and linting
 */
export async function postProcessCode(
  result: TransformResult,
  filePath: string,
  scoutPackage?: string
): Promise<string> {
  const lines: string[] = [];

  // Add enhanced generation comment with Scout best practices
  lines.push('/**');
  lines.push(` * This test was generated using Scout Recorder on ${new Date().toISOString()}`);
  lines.push(' *');
  lines.push(' * IMPORTANT: Review and improve this test before using in production!');
  lines.push(' *');
  lines.push(' * Scout Best Practices:');
  lines.push(' * - Use page.testSubj.locator() for data-test-subj selectors (more stable)');
  lines.push(' * - Create page objects for repeated UI interactions and complex components');
  lines.push(' * - Use page.waitForLoadingIndicatorHidden() instead of arbitrary timeouts');
  lines.push(' * - Focus on user interactions and rendering, not data validation');
  lines.push(' * - Each test should have clear, meaningful assertions');
  lines.push(' *');
  lines.push(' * Available Fixtures:');
  lines.push(' * - browserAuth: Login as different roles (loginAsAdmin, loginAsViewer, etc.)');
  lines.push(' * - pageObjects: Access reusable page objects for common UI interactions');
  lines.push(' * - kbnClient: Make HTTP requests to Kibana APIs');
  lines.push(' * - esClient: Interact with Elasticsearch');
  lines.push(' * - esArchiver: Load Elasticsearch data archives');
  lines.push(' * - log: Logging utility for debugging');
  lines.push(' *');

  // Add solution-specific resources based on scout package
  if (scoutPackage) {
    if (scoutPackage.includes('oblt')) {
      lines.push(' * Observability Resources:');
      lines.push(' * - @kbn/scout-oblt provides solution-specific fixtures and page objects');
      lines.push(' *');
    } else if (scoutPackage.includes('security')) {
      lines.push(' * Security Resources:');
      lines.push(' * - @kbn/scout-security provides solution-specific fixtures and page objects');
      lines.push(' *');
    }
  }

  lines.push(' * Learn more:');
  lines.push(' * - Scout docs: src/platform/packages/shared/kbn-scout/README.md');
  lines.push(
    ' * - Page objects: src/platform/packages/private/kbn-scout-info/llms/scout-page-objects.md'
  );
  lines.push(
    ' * - Best practices: src/platform/packages/private/kbn-scout-info/llms/what-is-scout.md'
  );
  lines.push(' */');
  lines.push('');

  // Add detected patterns as comments if any
  if (result.detectedPatterns.length > 0) {
    lines.push('/**');
    lines.push(' * Detected patterns during code generation:');
    result.detectedPatterns.forEach((pattern) => {
      lines.push(` * - ${pattern}`);
    });
    lines.push(' */');
    lines.push('');
  }

  // Add warnings if any
  if (result.warnings.length > 0) {
    lines.push('/**');
    lines.push(' * WARNINGS - Please address these:');
    result.warnings.forEach((warning) => {
      lines.push(` * - ${warning}`);
    });
    lines.push(' */');
    lines.push('');
  }

  // Add the transformed code with improvement suggestions
  const codeWithSuggestions = addImprovementSuggestions(result.code);
  lines.push(codeWithSuggestions);

  const unformattedCode = lines.join('\n');

  // Lint and auto-fix with ESLint
  return await lintAndFixCode(unformattedCode, filePath);
}

/**
 * Analyzes code and adds specific improvement suggestions based on detected patterns
 */
function addImprovementSuggestions(code: string): string {
  let improvedCode = code;

  // Detect and comment on waitForTimeout usage
  if (code.includes('waitForTimeout')) {
    improvedCode = improvedCode.replace(
      /(\s+)(await page\.waitForTimeout\([^)]+\);)/g,
      '$1// TODO: Replace arbitrary timeout with a specific wait condition\n' +
        "$1// Consider: await page.waitForLoadingIndicatorHidden() or await element.waitFor({ state: 'visible' })\n" +
        '$1$2'
    );
  }

  // Detect generic locators without data-test-subj
  if (code.match(/page\.locator\(['"][^'"]*['"]\)/)) {
    const hasTestSubj = code.includes('testSubj.locator');
    if (!hasTestSubj) {
      // Add a general comment at the start of the test
      improvedCode = `  // TODO: Consider using data-test-subj attributes for more stable selectors\n  // Example: page.testSubj.locator('myComponent') instead of page.locator('.my-class')\n  // See: https://github.com/elastic/kibana/blob/main/src/platform/packages/private/kbn-scout-info/llms/scout-page-objects.md\n\n${improvedCode}`;
    }
  }

  // Detect repeated selector patterns (potential page object candidates)
  const selectorMatches = improvedCode.match(/page\.(testSubj\.)?locator\(['"]([^'"]+)['"]\)/g);
  if (selectorMatches && selectorMatches.length > 3) {
    const uniqueSelectors = new Set(selectorMatches);
    if (uniqueSelectors.size < selectorMatches.length) {
      improvedCode = `  // TODO: This test has repeated selectors - consider creating a page object\n  // Page objects improve maintainability and reusability\n  // See: src/platform/packages/private/kbn-scout-info/llms/scout-page-objects.md\n\n${improvedCode}`;
    }
  }

  // Detect many assertions that might indicate data validation
  const assertionCount = (code.match(/expect\(/g) || []).length;
  if (assertionCount > 5) {
    improvedCode = `  // NOTE: This test has many assertions (${assertionCount})\n  // If you're validating data content (not just UI rendering), consider writing an API test instead\n  // UI tests should focus on user interactions and component rendering\n\n${improvedCode}`;
  }

  return improvedCode;
}

/**
 * Adds helpful TODO comments for manual review
 */
export function addTodoComments(code: string): string {
  // Add TODO for hardcoded waits
  let result = code.replace(
    /await page\.waitForTimeout\((\d+)\)/g,
    '// TODO: Replace timeout with specific condition\n  await page.waitForTimeout($1)'
  );

  // Add TODO for generic assertions
  result = result.replace(
    /expect\(page\)\.toHaveURL\(/g,
    '// TODO: Verify this URL assertion is correct\n  expect(page).toHaveURL('
  );

  return result;
}

/**
 * Lints and auto-fixes code using ESLint with the project's configuration
 */
export async function lintAndFixCode(code: string, filePath: string): Promise<string> {
  try {
    // Create ESLint instance with the project's configuration
    const eslint = new ESLint({
      cwd: REPO_ROOT,
      fix: true, // Enable auto-fixing
      useEslintrc: true, // Use .eslintrc.js from the repo
      extensions: ['.ts', '.tsx', '.js', '.mjs'],
    });

    // Lint the code
    const results = await eslint.lintText(code, {
      filePath, // Provide file path so ESLint can determine which rules to apply
    });

    // If there are fixable issues, return the fixed code
    if (results.length > 0 && results[0].output) {
      return results[0].output;
    }

    // No fixes applied, return original code
    return code;
  } catch (error) {
    // If linting fails, return the original code
    // This prevents the entire codegen from failing due to ESLint errors
    return code;
  }
}
