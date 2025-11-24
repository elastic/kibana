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
import { AXE_OPTIONS } from '@kbn/axe-config';

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
}

export interface RunA11yScanOptions {
  /** Optional CSS selectors to exclude from scan */
  exclude?: string[];
  /** Optional result impact levels to include (e.g. \['critical','serious'\]) */
  impactLevels?: Array<'minor' | 'moderate' | 'serious' | 'critical'>;
  /** Timeout in ms for the scan (defaults 10000) */
  timeoutMs?: number;
}

export interface RunA11yScanResult {
  violations: A11yViolation[];
}

export const runA11yScan = async (
  page: Page,
  { exclude = [], impactLevels, timeoutMs = 10000 }: RunA11yScanOptions = {}
): Promise<RunA11yScanResult> => {
  const builder = new AxeBuilder({ page });

  builder.options(AXE_OPTIONS);

  for (const selector of exclude) {
    builder.exclude(selector);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const axeResults = await builder.analyze();
    let violations = axeResults.violations as A11yViolation[];

    if (impactLevels && impactLevels.length) {
      const allowed = new Set(impactLevels);
      violations = violations.filter(
        (v) => v.impact && allowed.has(v.impact as (typeof impactLevels)[number])
      );
    }

    return { violations };
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      throw new Error(`Axe accessibility scan timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
};

/**
 * Assert helper usable inside tests.
 */
export const checkA11y = async (page: Page, kbnUrl?: KibanaUrl): Promise<void> => {
  const { violations } = await runA11yScan(page);

  if (violations.length) {
    const formatted = violations
      .map(
        (v) =>
          `${v.id} (${v.impact}): ${v.helpUrl}\n Url: ${kbnUrl?.toString()} Nodes:\n${v.nodes
            .map((n) => `    ${n.target.join(', ')} -> ${n.html}`)
            .join('\n')}`
      )
      .join('\n\n');
    throw new Error(`Accessibility violations:\n${formatted}`);
  }
};
