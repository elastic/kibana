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
export const FLAKY_TEST_REPORT_SCHEMA_VERSION = 2;

export const TEST_FRAMEWORKS = ['jest', 'ftr', 'cypress', 'playwright'] as const;
export const TestFrameworkSchema = z.enum(TEST_FRAMEWORKS);
export type TestFramework = z.infer<typeof TestFrameworkSchema>;

/**
 * `flaky`: recurring episodes or retry recoveries in one execution context.
 * `consistently-failing`: its latest runs there failed without passing on a retry.
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
  failuresCount: z.int(),
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
  failuresCount: z.int(),
  /** Distinct builds those attempts ran in. */
  buildsCount: z.int(),
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
 * The context that qualified a test, judged independently of other pipelines, branches, configs
 * and targets. Counts cover its qualifying window, including suspected incidents.
 */
export const FlakyTestFlakiestBranchSchema = z.object({
  pipeline: z.string(),
  branch: z.string(),
  configPath: z.optional(z.string()),
  targetMode: z.optional(z.string()),
  targetType: z.optional(z.string()),
  builds: z.int(),
  failedBuilds: z.int(),
  /** `failedBuilds / builds` on this branch. */
  buildFailRate: z.number(),
  /** Runs of consecutive failed builds, each separated from the next by a pass. */
  episodes: z.int(),
});
export type FlakyTestFlakiestBranch = z.infer<typeof FlakyTestFlakiestBranchSchema>;

export const FlakyTestQualificationSchema = z.object({
  classification: FlakyTestClassificationSchema,
  flakiestBranch: FlakyTestFlakiestBranchSchema,
  reasons: z
    .array(
      z.enum([
        'separate-episodes',
        'repeated-retry-recovery',
        'consecutive-terminal-failures',
        'historical-recurrence',
      ])
    )
    .min(1),
  windowDays: z.int(),
  recentEpisodes: z.int(),
  retryRecoveredBuilds: z.int(),
  trailingHardFailures: z.int(),
  historicalEpisodes: z.int(),
  historicalFailureDays: z.int(),
  lastFailedAt: z.coerce.date(),
  latestExecutionAt: z.coerce.date(),
  freshFailure: z.boolean(),
  suspectedIncidentBuilds: z.int(),
});
export type FlakyTestQualification = z.infer<typeof FlakyTestQualificationSchema>;

export const FlakyTestIncidentSchema = z.object({
  jobId: z.string(),
  failedTests: z.int(),
  testIds: z.array(z.string()),
});
export type FlakyTestIncident = z.infer<typeof FlakyTestIncidentSchema>;

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
   * The context in which the test cleared the thresholds; the top-level rate above is
   * diluted by the other branches. Absent in reports written before thresholds applied per branch.
   */
  flakiestBranch: z.optional(FlakyTestFlakiestBranchSchema),
  /** Every qualifying context; a test may be flaky here and consistently failing elsewhere. */
  qualifications: z.array(FlakyTestQualificationSchema).default([]),
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

/** Thresholds apply independently to each pipeline, branch, config and deployment target. */
export const FlakyTestReportThresholdsSchema = z.object({
  minEpisodes: z.int().min(2),
  minRetryRecoveries: z.int().min(2).default(2),
  minConsecutiveFailures: z.int().min(2).default(2),
  recentDays: z.int().min(1).default(14),
  maxRuns: z.int().min(2),
  minHistoricalEpisodes: z.int().min(2).default(3),
  minHistoricalFailureDays: z.int().min(2).default(3),
  freshFailureHours: z.int().min(1).default(24),
  /** Flag jobs with this many failing tests as suspected incidents; retain their evidence. */
  incidentFailures: z.int().min(1),
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
  lookbackDays: 28,
  pipelines: ['kibana-on-merge'],
  branches: [],
  frameworks: [...TEST_FRAMEWORKS],
  classifications: [...FLAKY_TEST_CLASSIFICATIONS],
  thresholds: {
    minEpisodes: 2,
    minRetryRecoveries: 2,
    minConsecutiveFailures: 2,
    recentDays: 14,
    minHistoricalEpisodes: 3,
    minHistoricalFailureDays: 3,
    freshFailureHours: 24,
    maxRuns: 200,
    incidentFailures: 10,
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
  /** Tests with recurring failures or retry recoveries in at least one context. */
  flaky: z.array(FlakyTestEntrySchema),
  /** Tests whose latest runs in at least one context all failed without recovery. */
  consistentlyFailing: z.array(FlakyTestEntrySchema),
  /** Broad job failures are retained even when no individual test qualifies. */
  suspectedIncidents: z.array(FlakyTestIncidentSchema).default([]),
  /**
   * Per-file, per-pipeline breakdown for the tests of both lists. Defaults so that reports
   * written before the field existed still parse.
   */
  files: z.array(FlakyTestFileStatsSchema).default([]),
});
export type FlakyTestReport = z.infer<typeof FlakyTestReportSchema>;
