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
export async function postProcessCode(result: TransformResult, filePath: string): Promise<string> {
  const lines: string[] = [];

  // Add generation comment
  lines.push('/**');
  lines.push(` * This test was generated using Scout codegen on ${new Date().toISOString()}`);
  lines.push(' *');
  lines.push(' * IMPORTANT: This is a starting point. Please review and refine:');
  lines.push(' * - Verify all assertions are correct');
  lines.push(' * - Add meaningful test descriptions');
  lines.push(' * - Consider adding more specific waits and assertions');
  lines.push(' * - Replace generic selectors with page objects where possible');
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

  // Add the transformed code
  lines.push(result.code);

  const unformattedCode = lines.join('\n');

  // Lint and auto-fix with ESLint
  return await lintAndFixCode(unformattedCode, filePath);
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
