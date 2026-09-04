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
 * Bump whenever a change to the schemas below would break a consumer that reads
 * a previously written report.
 */
export const FLAKINESS_REPORT_SCHEMA_VERSION = 1;

/**
 * Failure mechanism: *what kind* of failure this is, as opposed to what the fix's unit is.
 * Gates whether an automated fix attempt is even appropriate — `infra` failures are not
 * test bugs and must not be routed to the fixer.
 */
export const MechanismSchema = z.enum([
  'infra',
  'hook-setup',
  'test-timeout',
  'navigation',
  'ui-timeout',
  'ui-state',
  'api-status',
  'data-assertion',
  'unclassified',
]);

export type Mechanism = z.infer<typeof MechanismSchema>;

/** Raw file-level aggregation row. One per (spec file, reporter, pipeline). */
export const SpecObservationSchema = z.object({
  filePath: z.string(),
  reporterType: z.string(),
  pipelineSlug: z.string(),
  runs: z.int(),
  fails: z.int(),
  builds: z.int(),
  failedBuilds: z.int(),
  branches: z.int(),
  tests: z.int(),
  lastSeen: z.coerce.date(),
});

export type SpecObservation = z.infer<typeof SpecObservationSchema>;

/** Raw test-level aggregation row. One per (test, branch), fetched only for admitted specs. */
export const TestObservationSchema = z.object({
  testId: z.string(),
  title: z.string(),
  filePath: z.string(),
  reporterType: z.string(),
  branch: z.string(),
  runs: z.int(),
  fails: z.int(),
  builds: z.int(),
  failedBuilds: z.int(),
  lastSeen: z.coerce.date(),
});

export type TestObservation = z.infer<typeof TestObservationSchema>;

/** A single failure, used for mechanism classification and as issue evidence. */
export const FailureSampleSchema = z.object({
  filePath: z.string(),
  title: z.optional(z.string()),
  errorMessage: z.string(),
  mechanism: MechanismSchema,
  buildNumber: z.optional(z.int()),
  timestamp: z.optional(z.coerce.date()),
});

export type FailureSample = z.infer<typeof FailureSampleSchema>;

/** One test collapsed across every branch it was observed on. */
export const FlakyTestUnitSchema = z.object({
  testId: z.string(),
  title: z.string(),
  filePath: z.string(),
  reporterType: z.string(),
  branches: z.array(z.string()),
  runs: z.int(),
  fails: z.int(),
  builds: z.int(),
  failedBuilds: z.int(),
  /** `failedBuilds / builds`. Point estimate — do not threshold on this directly. */
  buildFailRate: z.number(),
  lastSeen: z.coerce.date(),
});

export type FlakyTestUnit = z.infer<typeof FlakyTestUnitSchema>;

/**
 * A group of flaky test units sharing one root cause, and the unit of one GitHub issue.
 * v0 only produces `spec` clusters; `shared-helper`, `config`, and `theme` come later.
 */
export const FlakyClusterSchema = z.object({
  clusterKey: z.string(),
  type: z.literal('spec'),
  filePath: z.string(),
  reporterType: z.string(),
  pipelineSlug: z.string(),
  /** Dominant mechanism across sampled failures. */
  mechanism: MechanismSchema,
  /** Failure counts per mechanism, so a mixed cluster is visible rather than flattened. */
  mechanismBreakdown: z.partialRecord(MechanismSchema, z.int()),
  impact: z.object({
    runs: z.int(),
    fails: z.int(),
    builds: z.int(),
    failedBuilds: z.int(),
    buildFailRate: z.number(),
    /** 95% Wilson lower bound on `buildFailRate`. This is the ranking and admission key. */
    wilsonLowerBound: z.number(),
    branches: z.int(),
  }),
  members: z.array(FlakyTestUnitSchema),
  sampleErrors: z.array(z.string()),
  lastSeen: z.coerce.date(),
});

export type FlakyCluster = z.infer<typeof FlakyClusterSchema>;

export const SuppressionReasonSchema = z.enum([
  'below-min-builds',
  'below-cluster-bar',
  'no-failures',
]);

export type SuppressionReason = z.infer<typeof SuppressionReasonSchema>;

export const SuppressedSchema = z.object({
  filePath: z.string(),
  reporterType: z.string(),
  reason: SuppressionReasonSchema,
  detail: z.string(),
});

export type Suppressed = z.infer<typeof SuppressedSchema>;

export const PolicySnapshotSchema = z.object({
  lookbackDays: z.int(),
  minBuilds: z.int(),
  confidenceZ: z.number(),
  defaultBuildFailRateThreshold: z.number(),
  buildFailRateThresholdByReporter: z.record(z.string(), z.number()),
  pipelineSlugs: z.array(z.string()),
  branches: z.array(z.string()),
  maxClusters: z.int(),
});

export type PolicySnapshot = z.infer<typeof PolicySnapshotSchema>;

/**
 * The artifact that separates the deterministic pipeline from everything downstream
 * (issue rendering, dashboards, agentic investigation). Versioned because it is a contract.
 */
export const FlakinessReportSchema = z.object({
  schemaVersion: z.literal(FLAKINESS_REPORT_SCHEMA_VERSION),
  generatedAt: z.coerce.date(),
  window: z.object({
    lookbackDays: z.int().min(1).max(30),
    from: z.coerce.date(),
    to: z.coerce.date(),
  }),
  policy: PolicySnapshotSchema,
  clusters: z.array(FlakyClusterSchema),
  suppressed: z.array(SuppressedSchema),
});

export type FlakinessReport = z.infer<typeof FlakinessReportSchema>;
