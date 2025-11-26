/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { AXE_OPTIONS, AXE_IMPACT_LEVELS } from '@kbn/axe-config';

import type { KibanaUrl } from '../../..';

export interface A11yViolation {
  id: string;
  impact?: string;
  description: string;
  help: string;
  helpUrl: string;
  nodes: Array<{
    html: string;
    target: string[];
    failureSummary?: string;
  }>;
  url?: string;
}

export interface RunA11yScanOptions {
  /** Optional CSS selectors to exclude from scan */
  exclude?: string[];
  /** Timeout in ms for the scan (defaults 10000) */
  timeoutMs?: number;
}

export interface RunA11yScanResult {
  violations: A11yViolation[];
}

export const runA11yScan = async (
  page: Page,
  { exclude = [], timeoutMs = 10000 }: RunA11yScanOptions = {}
): Promise<RunA11yScanResult> => {
  const builder = new AxeBuilder({ page });
  builder.options(AXE_OPTIONS);

  if (exclude) {
    for (const selector of exclude) {
      builder.exclude(selector);
    }
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

  let violations = (result.violations as A11yViolation[]) || [];

  if (AXE_IMPACT_LEVELS?.length) {
    const allowed = new Set(AXE_IMPACT_LEVELS);
    violations = violations.filter(
      (v) => v.impact && allowed.has(v.impact as (typeof AXE_IMPACT_LEVELS)[number])
    );
  }

  return { violations };
};

/**
 * Assert helper usable inside tests.
 */
export const checkA11y = async (page: Page, kbnUrl?: KibanaUrl, options?: RunA11yScanOptions) => {
  const { violations } = await runA11yScan(page, options);

  return {
    violations: violations.map(
      (v) =>
        `Accessibility violation: ${v.id} (${v.impact}): \n
          ${v.helpUrl}\n
          ${v.description}\n
          ${kbnUrl} \n
          Nodes:\n${v.nodes
            .map((n) => `    ${n.target.join(', ')} -> ${n.failureSummary}`)
            .join('\n')}`
    ),
  };
};
