/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import chalk from 'chalk';
import { subj as testSubjectToCss } from '@kbn/test-subj-selector';
import { AXE_CONFIG, AXE_OPTIONS } from '@kbn/axe-config';

import { FtrService } from '../../ftr_provider_context';
import type { AxeReport } from './axe_report';
import { printResult } from './axe_report';
import { analyzeWithAxe, analyzeWithAxeWithClient } from './analyze_with_axe';

interface AxeContext {
  include?: string[];
  exclude?: string[][];
}

export type AccessibilitySnapshotProfile = 'default' | 'strictWcag22aa';

export interface AccessibilitySnapshotOptions {
  profile?: AccessibilitySnapshotProfile;
  excludeTestSubj?: string | string[];
}

export const normalizeResult = (report: any) => {
  if (report.error) {
    const error = new Error(report.error.message);
    error.stack = report.error.stack;
    throw report.error;
  }

  return report.result as false | AxeReport;
};

const STRICT_AXE_CONFIG = {
  rules: [],
};

const STRICT_AXE_OPTIONS = {
  reporter: 'v2' as const,
  runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'],
  rules: {
    'color-contrast': { enabled: true },
    bypass: { enabled: true },
    'nested-interactive': { enabled: true },
    'target-size': { enabled: true },
  },
};

/**
 * Accessibility testing service using the Axe (https://www.deque.com/axe/)
 * toolset to validate a11y rules similar to ESLint. In order to test against
 * the rules we must load up the UI and feed a full HTML snapshot into Axe.
 */
export class AccessibilityService extends FtrService {
  private readonly browser = this.ctx.getService('browser');
  private readonly Wd = this.ctx.getService('__webdriver__');

  public async testAppSnapshot(options: AccessibilitySnapshotOptions = {}) {
    if (options.profile === 'strictWcag22aa') {
      const context = this.getStrictAxeContext();
      const report = await this.captureAxeReport(context, STRICT_AXE_CONFIG, STRICT_AXE_OPTIONS);
      this.assertValidAxeReportStrict(report);
    } else {
      const context = this.getAxeContext(true, options.excludeTestSubj);
      const report = await this.captureAxeReport(context, AXE_CONFIG, AXE_OPTIONS);
      this.assertValidAxeReport(report);
    }
  }

  public async testGlobalSnapshot(options: AccessibilitySnapshotOptions = {}) {
    if (options.profile === 'strictWcag22aa') {
      const context = this.getStrictAxeContext();
      const report = await this.captureAxeReport(context, STRICT_AXE_CONFIG, STRICT_AXE_OPTIONS);
      this.assertValidAxeReportStrict(report);
    } else {
      const context = this.getAxeContext(false, options.excludeTestSubj);
      const report = await this.captureAxeReport(context, AXE_CONFIG, AXE_OPTIONS);
      this.assertValidAxeReport(report);
    }
  }

  private getStrictAxeContext(): AxeContext {
    return {
      include: [testSubjectToCss('appA11yRoot')],
    };
  }

  private getAxeContext(global: boolean, excludeTestSubj?: string | string[]): AxeContext {
    return {
      include: global ? undefined : [testSubjectToCss('appA11yRoot')],
      exclude: ([] as string[])
        .concat(excludeTestSubj || [])
        .map((ts) => [testSubjectToCss(ts)])
        .concat([['[role="graphics-document"][aria-roledescription="visualization"]']]),
    };
  }

  private assertValidAxeReport(report: AxeReport) {
    const errorMsgs = [];

    for (const result of report.violations) {
      errorMsgs.push(printResult(chalk.red('VIOLATION'), result));
    }

    if (errorMsgs.length) {
      throw new Error(`a11y report:\n${errorMsgs.join('\n')}`);
    }
  }

  private assertValidAxeReportStrict(report: AxeReport) {
    if (!report.violations.length) return;

    const lines: string[] = [];
    for (const violation of report.violations) {
      for (const node of violation.nodes) {
        lines.push(
          [
            `rule: ${violation.id}`,
            `impact: ${violation.impact}`,
            `html: ${node.html}`,
            `target: ${node.target?.join(', ')}`,
          ].join(' | ')
        );
      }
    }
    throw new Error(`strict a11y violations:\n${lines.join('\n')}`);
  }

  private async captureAxeReport(
    context: AxeContext,
    axeConfig: typeof AXE_CONFIG,
    axeOptions: typeof AXE_OPTIONS
  ): Promise<AxeReport> {
    await this.Wd.driver.manage().setTimeouts({
      ...(await this.Wd.driver.manage().getTimeouts()),
      script: 600000,
    });

    const report = normalizeResult(
      await this.browser.executeAsync(analyzeWithAxe, context, axeConfig, axeOptions)
    );

    if (report !== false) {
      return report;
    }

    const withClientReport = normalizeResult(
      await this.browser.executeAsync(analyzeWithAxeWithClient, context, axeConfig, axeOptions)
    );

    if (withClientReport === false) {
      throw new Error('Attempted to analyze with axe but failed to load axe client');
    }

    return withClientReport;
  }
}
