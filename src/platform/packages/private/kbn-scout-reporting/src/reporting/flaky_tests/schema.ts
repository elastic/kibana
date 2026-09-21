/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';

/**
 * Bump whenever a change to the schemas below would break a consumer reading a previously
 * written report.
 */
export const FLAKY_TEST_REPORT_SCHEMA_VERSION = 1;

export const TEST_FRAMEWORKS = ['jest', 'ftr', 'cypress', 'playwright'] as const;
export const TestFrameworkSchema = z.enum(TEST_FRAMEWORKS);
export type TestFramework = z.infer<typeof TestFrameworkSchema>;

export const FlakyTestSampleFailureSchema = z.object({
  message: z.string(),
  buildUrl: z.optional(z.string()),
  timestamp: z.coerce.date(),
});
export type FlakyTestSampleFailure = z.infer<typeof FlakyTestSampleFailureSchema>;

/**
 * Most recent run of the test on one branch within the report window, regardless of result.
 * `status` is the framework's own verdict (`passed`, `failed`, `timedOut`, `skipped`, `todo`,
 * ...); Playwright runs that passed on retry report `flaky`.
 */
export const FlakyTestBranchLatestRunSchema = z.object({
  status: z.string(),
  timestamp: z.coerce.date(),
  buildUrl: z.optional(z.string()),
});
export type FlakyTestBranchLatestRun = z.infer<typeof FlakyTestBranchLatestRunSchema>;

/** Most recent run of the test across all branches in scope. */
export const FlakyTestLatestRunSchema = FlakyTestBranchLatestRunSchema.extend({
  branch: z.string(),
});
export type FlakyTestLatestRun = z.infer<typeof FlakyTestLatestRunSchema>;

/** Build counts of one test on one branch; the entry-level counts are the sum over branches. */
export const FlakyTestBranchStatsSchema = z.object({
  branch: z.string(),
  builds: z.int(),
  failedBuilds: z.int(),
  /** `failedBuilds / builds` on this branch. */
  buildFailRate: z.number(),
  /** Absent when the test never failed on this branch. */
  lastFailedAt: z.optional(z.coerce.date()),
  latestRun: z.optional(FlakyTestBranchLatestRunSchema),
});
export type FlakyTestBranchStats = z.infer<typeof FlakyTestBranchStatsSchema>;

/**
 * One test aggregated over the report window. Counts are per execution (one per test run;
 * Playwright in-run retries collapse into a single execution) and per Buildkite build.
 */
export const FlakyTestEntrySchema = z.object({
  testId: z.string(),
  framework: TestFrameworkSchema,
  title: z.string(),
  filePath: z.string(),
  configPath: z.optional(z.string()),
  owners: z.array(z.string()),
  areas: z.array(z.string()),
  /** Executions that were not skipped. */
  runs: z.int(),
  /** Executions with at least one failed attempt. */
  fails: z.int(),
  /** Executions that passed on the first attempt. */
  passes: z.int(),
  /** Executions that failed and then passed within the same run (Playwright retries only). */
  retryFlakes: z.int(),
  /** Distinct Buildkite builds the test ran in. */
  builds: z.int(),
  /** Distinct Buildkite builds with at least one failed execution. */
  failedBuilds: z.int(),
  /** `failedBuilds / builds`. */
  buildFailRate: z.number(),
  /** Distinct branches with at least one failed execution. */
  failedBranches: z.int(),
  /** Per-branch breakdown of `builds` / `failedBuilds`, most failed builds first. */
  byBranch: z.array(FlakyTestBranchStatsSchema),
  firstFailedAt: z.coerce.date(),
  lastFailedAt: z.coerce.date(),
  /** Absent only if the test emitted no execution events in the window (should not happen). */
  latestRun: z.optional(FlakyTestLatestRunSchema),
  sampleFailures: z.array(FlakyTestSampleFailureSchema),
});
export type FlakyTestEntry = z.infer<typeof FlakyTestEntrySchema>;

export const FlakyTestReportThresholdsSchema = z.object({
  /** Tests seen in fewer builds than this are ignored. */
  minBuilds: z.int().min(1),
  /** Tests that failed in fewer builds than this are ignored. */
  minFailedBuilds: z.int().min(1),
  /** Maximum number of tests kept per list. */
  maxTests: z.int().min(1),
});
export type FlakyTestReportThresholds = z.infer<typeof FlakyTestReportThresholdsSchema>;

export interface FlakyTestReportOptions {
  lookbackDays: number;
  pipelines: string[];
  branches: string[];
  frameworks: TestFramework[];
  thresholds: FlakyTestReportThresholds;
  samplesPerTest: number;
  /** Upper bound of the window; defaults to the current time. */
  now?: Date;
}

export const DEFAULT_FLAKY_TEST_REPORT_OPTIONS: Omit<FlakyTestReportOptions, 'now'> = {
  lookbackDays: 7,
  pipelines: ['kibana-on-merge'],
  branches: [],
  frameworks: [...TEST_FRAMEWORKS],
  thresholds: {
    minBuilds: 10,
    minFailedBuilds: 2,
    maxTests: 200,
  },
  samplesPerTest: 3,
};

export const FlakyTestReportSchema = z.object({
  schemaVersion: z.literal(FLAKY_TEST_REPORT_SCHEMA_VERSION),
  generatedAt: z.coerce.date(),
  window: z.object({
    lookbackDays: z.int().min(1),
    from: z.coerce.date(),
    to: z.coerce.date(),
  }),
  scope: z.object({
    pipelines: z.array(z.string()),
    /** Empty means no branch filter. */
    branches: z.array(z.string()),
    frameworks: z.array(TestFrameworkSchema),
  }),
  thresholds: FlakyTestReportThresholdsSchema,
  summary: z.object({
    totalFlaky: z.int(),
    totalConsistentlyFailing: z.int(),
    flakyByFramework: z.partialRecord(TestFrameworkSchema, z.int()),
  }),
  /** Tests that failed in some builds and passed in others, ranked by failed builds. */
  flaky: z.array(FlakyTestEntrySchema),
  /** Tests that never had a clean pass in the window; broken rather than flaky. */
  consistentlyFailing: z.array(FlakyTestEntrySchema),
});
export type FlakyTestReport = z.infer<typeof FlakyTestReportSchema>;
