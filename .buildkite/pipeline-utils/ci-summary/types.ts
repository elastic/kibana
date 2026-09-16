/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Producer-side mirror of `schema.json`. The JSON file is the contract consumers
 * read; keep both in sync and bump `CI_SUMMARY_SCHEMA_VERSION` on breaking changes.
 */
export const CI_SUMMARY_SCHEMA_VERSION = 1;

export const CI_SUMMARY_BUCKET = 'ci-artifacts.kibana.dev';
export const CI_SUMMARY_PREFIX = 'ci-summary';

export type CiSummaryFailureKind =
  | 'test_failures'
  | 'command_failed'
  | 'timeout'
  | 'agent_lost'
  | 'canceled';

export type CiSummaryJobState =
  | 'passed'
  | 'failed'
  | 'soft_failed'
  | 'timed_out'
  | 'canceled'
  | 'skipped'
  | 'running'
  | 'pending';

export interface CiSummaryTestFailures {
  count: number;
  githubIssues: string[];
  artifactGlob: string;
}

export interface CiSummaryJob {
  id: string;
  key: string | null;
  label: string;
  state: CiSummaryJobState;
  exitStatus: number | null;
  softFailed: boolean;
  /** True when this attempt was superseded by a retry; the final attempt has `retried: false`. */
  retried: boolean;
  retryCount: number;
  durationMs: number | null;
  url: string;
  failureKind: CiSummaryFailureKind | null;
  /** Last Buildkite section header open when the command exited; null when unavailable. */
  failingSection: string | null;
  testFailures?: CiSummaryTestFailures;
  /** Buildkite artifact URL (auth required) holding the tail of the failing section. */
  logTailUrl?: string;
}

export interface CiSummary {
  schemaVersion: typeof CI_SUMMARY_SCHEMA_VERSION;
  /** False when the producer hit a cap or a partial error; the manifest is still usable. */
  complete: boolean;
  generatedAt: string;
  build: {
    id: string;
    number: number;
    pipeline: string;
    url: string;
    branch: string;
    commit: string;
    prNumber: number | null;
    /** Derived from job outcomes at Post-Build time; the API build state is still `running`. */
    state: 'passed' | 'failed';
    startedAt: string | null;
    /** Observation time when the build has not finished; jobs after Post-Build are excluded. */
    finishedAt: string | null;
    durationMs: number | null;
  };
  summary: {
    total: number;
    passed: number;
    failed: number;
    softFailed: number;
    skipped: number;
    canceled: number;
    unfinished: number;
    retried: number;
  };
  jobs: CiSummaryJob[];
}

export const getCiSummaryUrl = (buildId: string): string =>
  `https://${CI_SUMMARY_BUCKET}/${CI_SUMMARY_PREFIX}/build/${buildId}.json`;

export const getCiSummaryPrUrl = (prNumber: number): string =>
  `https://${CI_SUMMARY_BUCKET}/${CI_SUMMARY_PREFIX}/pr/${prNumber}/latest.json`;
