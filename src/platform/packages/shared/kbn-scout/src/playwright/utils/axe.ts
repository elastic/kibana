/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Page } from '@playwright/test';
import type { Result } from 'axe-core';
import AxeBuilder from '@axe-core/playwright';
import { AXE_OPTIONS, AXE_IMPACT_LEVELS } from '@kbn/axe-config';

export interface RunA11yScanOptions {
  /** Optional CSS selectors to include in analysis */
  include?: string[];
  /** Optional CSS selectors to exclude from analysis */
  exclude?: string[];
  /** Timeout in ms for the scan (defaults 10000) */
  timeoutMs?: number;
}

/**
 * Runs an Axe accessibility scan
 *
 * Failure modes:
 * - Timeout: Can occur on large or complex DOMs. The scan rejects with a timeout Error; tests should
 *   be made more isolated by narrowing scope via the `include` option.
 * - Axe/Playwright errors: Underlying errors propagate and indicate a failed scan.
 */
const runA11yScan = async (
  page: Page,
  { include = [], exclude = [], timeoutMs = 10000 }: RunA11yScanOptions = {}
) => {
  const builder = new AxeBuilder({ page });
  builder.options(AXE_OPTIONS);

  for (const selector of include) {
    builder.include(selector);
  }

  for (const selector of exclude) {
    builder.exclude(selector);
  }

  const analysisPromise = builder.analyze();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const result = await Promise.race([
    analysisPromise,
    new Promise<never>((_, reject) => {
      timeoutId = setTimeout(
        () => reject(new Error(`Axe accessibility scan timed out after ${timeoutMs}ms`)),
        timeoutMs
      );
    }),
  ]);

  if (timeoutId) {
    clearTimeout(timeoutId);
  }

  let violations: Result[] = result.violations;

  if (AXE_IMPACT_LEVELS?.length) {
    violations = violations.filter((v) => v.impact && AXE_IMPACT_LEVELS.includes(v.impact));
  }

  return { violations };
};

export const checkA11y = async (page: Page, options?: RunA11yScanOptions) => {
  const { violations } = await runA11yScan(page, options);

  const formatA11yViolation = (v: Result): string => {
    const nodesSection = v.nodes
      .map((n, idx) => {
        const selectors = `${n.target.join(', ')}(xpath: ${n.xpath})`;
        const failure = n.failureSummary?.trim() || 'No failure summary provided';
        return `  ${idx + 1}. Selectors: ${selectors}\n     Failure: ${failure}`;
      })
      .join('\n');

    return [
      `\nAccessibility violation detected!\n`,
      `  Rule: ${v.id}. Impact: (${v.impact ?? 'impact unknown'})`,
      `  Description: ${v.description}`,
      `  Help: ${v.help}. See more: ${v.helpUrl}`,
      `  Page: ${page.url()}`,
      `  Nodes:\n${nodesSection}`,
    ]
      .join('\n')
      .trim();
  };

  return {
    violations: violations.map((v) => formatA11yViolation(v)),
  };
};
