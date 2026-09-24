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

/**
 * `flaky`: failed in some builds and passed in others. `consistently-failing`: never had a
 * clean pass in the window.
 */
export const FLAKY_TEST_CLASSIFICATIONS = ['flaky', 'consistently-failing'] as const;
export const FlakyTestClassificationSchema = z.enum(FLAKY_TEST_CLASSIFICATIONS);
export type FlakyTestClassification = z.infer<typeof FlakyTestClassificationSchema>;

export const FlakyTestSampleFailureSchema = z.object({
  message: z.string(),
  buildUrl: z.optional(z.string()),
  /** Buildkite job the failure happened in; `<buildUrl>#<jobId>` opens its log. */
  jobId: z.optional(z.string()),
  /** Label of the Buildkite step, e.g. `FTR Configs #21` or `Scout Lane #3 - stateful-classic / default`. */
  stepLabel: z.optional(z.string()),
  timestamp: z.coerce.date(),
});
export type FlakyTestSampleFailure = z.infer<typeof FlakyTestSampleFailureSchema>;

/** Failed attempts with one error on one pipeline. */
export const FlakyTestErrorPipelineSchema = z.object({
  pipeline: z.string(),
  failures: z.int(),
});

/**
 * One distinct error of a test over the window, across every pipeline and branch, not just the
 * report scope. Errors are told apart by the first three lines of their message with ids, URLs
 * and numbers normalised away, so a diff that differs only in a count is one error.
 */
export const FlakyTestErrorSchema = z.object({
  /** The normalised head the failures were grouped on; lets a consumer merge errors across tests. */
  key: z.string(),
  /** The newest failure's message, in full. */
  message: z.string(),
  /** Failed attempts with this error. */
  failures: z.int(),
  /** Distinct builds those attempts ran in. */
  builds: z.int(),
  /** Most failures first. */
  byPipeline: z.array(FlakyTestErrorPipelineSchema),
  /** Distinct branches, sorted; pull request builds record the head ref as `owner:branch`. */
  branches: z.array(z.string()),
  /** Distinct target modes, sorted (`unknown` for frameworks without a Scout target). */
  targets: z.array(z.string()),
  firstFailedAt: z.coerce.date(),
  lastFailedAt: z.coerce.date(),
  /** The newest failure's build and Buildkite job; `<url>#<jobId>` opens the job's log. */
  lastFailedBuildUrl: z.optional(z.string()),
  lastFailedJobId: z.optional(z.string()),
});
export type FlakyTestError = z.infer<typeof FlakyTestErrorSchema>;

/**
 * Most recent run of the test on one branch within the report window, regardless of result.
 * `status` is the framework's own verdict (`passed`, `failed`, `timedOut`, `skipped`, `todo`,
 * ...); Playwright runs that passed on retry report `flaky`.
 */
export const FlakyTestBranchLatestRunSchema = z.object({
  status: z.string(),
  timestamp: z.coerce.date(),
  buildUrl: z.optional(z.string()),
  /** Buildkite job of that run; `<buildUrl>#<jobId>` opens its log. */
  jobId: z.optional(z.string()),
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
  /** The build of that failure and its Buildkite job; `<url>#<jobId>` opens the job's log. */
  lastFailedBuildUrl: z.optional(z.string()),
  lastFailedJobId: z.optional(z.string()),
  /** Most recent execution, i.e. run that was not skipped; absent when every run was skipped. */
  latestExecutionAt: z.optional(z.coerce.date()),
  latestRun: z.optional(FlakyTestBranchLatestRunSchema),
});
export type FlakyTestBranchStats = z.infer<typeof FlakyTestBranchStatsSchema>;

/**
 * Build counts of one test on one Scout test target, any branch. Only Scout (Playwright) runs
 * record a target; Jest, FTR and Cypress runs report the mode `unknown`.
 */
export const FlakyTestTargetStatsSchema = z.object({
  /** `<arch>-<domain>`, e.g. `stateful-classic` or `serverless-security_complete`. */
  mode: z.string(),
  /** Where the target ran: `local` or `cloud`. */
  type: z.string(),
  builds: z.int(),
  failedBuilds: z.int(),
  /** `failedBuilds / builds` on this target. */
  buildFailRate: z.number(),
  /** Absent when the test never failed on this target. */
  lastFailedAt: z.optional(z.coerce.date()),
  /** The build of that failure and its Buildkite job; `<url>#<jobId>` opens the job's log. */
  lastFailedBuildUrl: z.optional(z.string()),
  lastFailedJobId: z.optional(z.string()),
});
export type FlakyTestTargetStats = z.infer<typeof FlakyTestTargetStatsSchema>;

/**
 * The branch that qualified a test: the one with the highest build failure rate among the
 * branches that clear every threshold on their own, so that a clean branch cannot dilute a
 * flaky one.
 */
export const FlakyTestFlakiestBranchSchema = z.object({
  branch: z.string(),
  builds: z.int(),
  failedBuilds: z.int(),
  /** `failedBuilds / builds` on this branch. */
  buildFailRate: z.number(),
});
export type FlakyTestFlakiestBranch = z.infer<typeof FlakyTestFlakiestBranchSchema>;

/**
 * One test aggregated over the report window. Counts are per execution (one per test run;
 * Playwright in-run retries collapse into a single execution) and per Buildkite build.
 */
export const FlakyTestEntrySchema = z.object({
  testId: z.string(),
  framework: TestFrameworkSchema,
  title: z.string(),
  /** Title of the enclosing suite (describe blocks), when the framework reports one. */
  suiteTitle: z.optional(z.string()),
  filePath: z.string(),
  configPath: z.optional(z.string()),
  /**
   * What the config runs: `ui-test`, `api-test`, `unit-test`, `unit-integration-test` or
   * `unknown`. Absent in reports written before the field existed.
   */
  configCategory: z.optional(z.string()),
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
  /**
   * Per-target breakdown of `builds` / `failedBuilds`, most failed builds first. Defaults so
   * that reports written before the field existed still parse.
   */
  byTarget: z.array(FlakyTestTargetStatsSchema).default([]),
  firstFailedAt: z.coerce.date(),
  lastFailedAt: z.coerce.date(),
  /**
   * The branch on which the test cleared the thresholds; the top-level rate above is diluted
   * by the other branches. Absent in reports written before thresholds applied per branch.
   */
  flakiestBranch: z.optional(FlakyTestFlakiestBranchSchema),
  /** Absent only if the test emitted no execution events in the window (should not happen). */
  latestRun: z.optional(FlakyTestLatestRunSchema),
  sampleFailures: z.array(FlakyTestSampleFailureSchema),
  /**
   * The test's distinct errors over the window, most failures first. Defaults so that reports
   * written before the field existed still parse.
   */
  errors: z.array(FlakyTestErrorSchema).default([]),
});
export type FlakyTestEntry = z.infer<typeof FlakyTestEntrySchema>;

/** Build counts on one Buildkite pipeline, any branch, for the tests of one file. */
export const FlakyTestPipelineStatsSchema = z.object({
  pipeline: z.string(),
  builds: z.int(),
  failedBuilds: z.int(),
  /** `failedBuilds / builds` on this pipeline. */
  buildFailRate: z.number(),
  /** Distinct branches with at least one failed execution. */
  failedBranches: z.int(),
  /**
   * Names of those branches, sorted; pull request builds record the head ref as `owner:branch`.
   * Absent in reports written before the field existed.
   */
  failedBranchNames: z.optional(z.array(z.string())),
  lastFailedAt: z.optional(z.coerce.date()),
  /** The most recent build with a failure. */
  lastFailedBuildUrl: z.optional(z.string()),
  /** Buildkite job of that failure; `<lastFailedBuildUrl>#<lastFailedJobId>` opens its log. */
  lastFailedJobId: z.optional(z.string()),
  /** Label of the Buildkite step that failure ran in. */
  lastFailedStepLabel: z.optional(z.string()),
});
export type FlakyTestPipelineStats = z.infer<typeof FlakyTestPipelineStatsSchema>;

/**
 * The tests of one file that made it into the report, with their failures broken down by
 * pipeline across every pipeline and branch in the window, not just the report scope. A build
 * counts once however many of the file's tests failed in it.
 */
export const FlakyTestFileStatsSchema = z.object({
  filePath: z.string(),
  framework: TestFrameworkSchema,
  testIds: z.array(z.string()),
  /** Most failed builds first. */
  byPipeline: z.array(FlakyTestPipelineStatsSchema),
});
export type FlakyTestFileStats = z.infer<typeof FlakyTestFileStatsSchema>;

/**
 * A test qualifies when a single branch clears all three build thresholds on its own: a test
 * flaky on `9.5` but clean on `main` is judged on its `9.5` numbers, not on the diluted total.
 */
export const FlakyTestReportThresholdsSchema = z.object({
  /** Branches on which the test was seen in fewer builds than this cannot qualify it. */
  minBuilds: z.int().min(1),
  /** Branches on which the test failed in fewer builds than this cannot qualify it. */
  minFailedBuilds: z.int().min(1),
  /**
   * Branches on which `failedBuilds / builds` is below this fraction cannot qualify the test
   * (`0.03` for 3%); `0` keeps every test that clears the build counts. The schema default is
   * `0` only so that reports written before the field existed, without a rate gate, still parse.
   */
  minFailRate: z.number().min(0).max(1).default(0),
  /** Maximum number of tests kept per list. */
  maxTests: z.int().min(1),
});
export type FlakyTestReportThresholds = z.infer<typeof FlakyTestReportThresholdsSchema>;

export interface FlakyTestReportOptions {
  lookbackDays: number;
  pipelines: string[];
  branches: string[];
  frameworks: TestFramework[];
  /** Which lists to compute; tests of an omitted classification are dropped before decoration. */
  classifications: FlakyTestClassification[];
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
  classifications: [...FLAKY_TEST_CLASSIFICATIONS],
  thresholds: {
    minBuilds: 10,
    minFailedBuilds: 2,
    minFailRate: 0.03,
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
    /**
     * Lists that were computed; an omitted classification has an empty list and a zero total.
     * Defaults to both so reports written before the field existed still parse.
     */
    classifications: z
      .array(FlakyTestClassificationSchema)
      .default([...FLAKY_TEST_CLASSIFICATIONS]),
  }),
  thresholds: FlakyTestReportThresholdsSchema,
  summary: z.object({
    totalFlaky: z.int(),
    totalConsistentlyFailing: z.int(),
    flakyByFramework: z.partialRecord(TestFrameworkSchema, z.int()),
    /**
     * Flaky tests by the branch they qualified on (`flakiestBranch.branch`), largest count
     * first. Empty in reports written before thresholds applied per branch.
     */
    flakyByBranch: z.record(z.string(), z.int()).default({}),
  }),
  /** Tests that failed in some builds and passed in others, ranked by failed builds. */
  flaky: z.array(FlakyTestEntrySchema),
  /** Tests that never had a clean pass in the window; broken rather than flaky. */
  consistentlyFailing: z.array(FlakyTestEntrySchema),
  /**
   * Per-file, per-pipeline breakdown for the tests of both lists. Defaults so that reports
   * written before the field existed still parse.
   */
  files: z.array(FlakyTestFileStatsSchema).default([]),
});
export type FlakyTestReport = z.infer<typeof FlakyTestReportSchema>;
