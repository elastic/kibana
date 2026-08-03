/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License, v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

export const WARM_START_MEMORY_REPORT_PATH_ENV = 'KIBANA_CI_WARM_START_MEMORY_REPORT_PATH';
export const DEFAULT_WARM_START_MEMORY_REPORT_PATH =
  'target/warm_start_memory_regression_report.json';

export interface WarmStartMemoryRegressionReportContext {
  readonly baselineCommit?: string;
  readonly targetCommit?: string;
  readonly baselineBuildId?: string;
  readonly targetBuildId?: string;
}

export interface WarmStartMemoryRegressionReport {
  readonly version: 1;
  readonly outcome: 'observed' | 'inconclusive' | 'regression';
  readonly enforcement: 'observe' | 'fail';
  readonly context?: WarmStartMemoryRegressionReportContext;
  readonly protocol: {
    readonly monitorIntervalMs: number;
    readonly postReadySettlingMs: number;
    readonly tailSampleCount: number;
    readonly forcedGcTimeoutMs: number;
    readonly confidence: number;
    readonly materialityBytes: number;
  };
  readonly comparison: {
    readonly baselineIdentity?: string;
    readonly targetIdentity?: string;
    readonly seed?: string;
    readonly requestedPairs: number;
    readonly attemptedPairs: number;
    readonly validPairs: number;
    readonly order: readonly string[];
  };
  readonly starts: readonly Record<string, unknown>[];
  readonly pairs: readonly Record<string, unknown>[];
  readonly tailHeapUsed: Record<string, unknown>;
  readonly postForcedGcHeapUsed: Record<string, unknown>;
  readonly diagnostics: Record<string, unknown>;
}

export const getWarmStartMemoryRegressionReportPath = (): string =>
  process.env[WARM_START_MEMORY_REPORT_PATH_ENV] ?? DEFAULT_WARM_START_MEMORY_REPORT_PATH;

export const getWarmStartMemoryRegressionReportContextFromEnv = ():
  | WarmStartMemoryRegressionReportContext
  | undefined => {
  const context: WarmStartMemoryRegressionReportContext = {
    baselineCommit:
      process.env.KIBANA_CI_WARM_START_MEMORY_BASELINE_COMMIT ?? process.env.GITHUB_PR_MERGE_BASE,
    targetCommit:
      process.env.KIBANA_CI_WARM_START_MEMORY_TARGET_COMMIT ?? process.env.BUILDKITE_COMMIT,
    baselineBuildId: process.env.KIBANA_CI_WARM_START_MEMORY_BASELINE_BUILD_ID,
    targetBuildId:
      process.env.KIBANA_CI_WARM_START_MEMORY_TARGET_BUILD_ID ?? process.env.BUILDKITE_BUILD_ID,
  };
  const definedContext = Object.fromEntries(
    Object.entries(context).filter(([, value]) => value !== undefined && value !== '')
  ) as WarmStartMemoryRegressionReportContext;

  return Object.keys(definedContext).length ? definedContext : undefined;
};

export const writeWarmStartMemoryRegressionReport = async (
  report: WarmStartMemoryRegressionReport,
  reportPath: string = getWarmStartMemoryRegressionReportPath()
): Promise<string> => {
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return reportPath;
};
