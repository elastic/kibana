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
  firstFailedAt: z.coerce.date(),
  lastFailedAt: z.coerce.date(),
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
