/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Build } from '../buildkite/types/build.ts';
import type { Job } from '../buildkite/types/job.ts';
import type { TestFailure } from '../test-failures/annotate.ts';
import {
  CI_SUMMARY_SCHEMA_VERSION,
  type CiSummary,
  type CiSummaryFailureKind,
  type CiSummaryJob,
  type CiSummaryJobState,
} from './types.ts';
import { toPublicHeader } from './log_sections.ts';

/** Public JSON size ceiling; jobs are trimmed of optional detail beyond this. */
export const MAX_MANIFEST_BYTES = 200 * 1024;
/** Upper bound on failed jobs whose logs are fetched in Post-Build. */
export const MAX_LOG_TAIL_JOBS = 15;
/** Logs larger than this are skipped instead of read into memory. */
export const MAX_LOG_BYTES = 50 * 1024 * 1024;
/** Wall-clock budget for all log fetches; Post-Build has a 10 minute step timeout. */
export const LOG_FETCH_BUDGET_MS = 4 * 60 * 1000;
export const LOG_TAIL_LINES = 500;

const HARD_FAILURE_STATES: Partial<Record<Job['state'], true>> = {
  failed: true,
  timed_out: true,
  timing_out: true,
  waiting_failed: true,
  unblocked_failed: true,
  blocked_failed: true,
};

export interface JobLogInfo {
  failingSection: string | null;
  logTailUrl?: string;
}

export interface CollectInput {
  build: Build;
  /** Build verdict from `BuildkiteClient.getBuildStatus`; the API build state is still `running` here. */
  success: boolean;
  testFailures: TestFailure[];
  logs: ReadonlyMap<string, JobLogInfo>;
  complete: boolean;
  now: Date;
}

/** Script jobs only; wait/block/trigger jobs carry no outcome an agent needs. */
export const isReportableJob = (job: Job): boolean => job.type === 'script';

export const classifyJob = (job: Job, testFailureCount: number): CiSummaryFailureKind | null => {
  if (job.state === 'canceled' || job.state === 'canceling') {
    return 'canceled';
  }
  if (job.state === 'timed_out' || job.state === 'timing_out') {
    return 'timeout';
  }
  if (HARD_FAILURE_STATES[job.state] !== true) {
    return null;
  }
  // Buildkite reports -1 when the agent was lost or the process was killed externally.
  if (job.exit_status === -1) {
    return 'agent_lost';
  }
  if (testFailureCount > 0) {
    return 'test_failures';
  }
  return 'command_failed';
};

export const toJobState = (job: Job): CiSummaryJobState => {
  if (job.soft_failed) {
    return 'soft_failed';
  }
  switch (job.state) {
    case 'passed':
      return 'passed';
    case 'timed_out':
    case 'timing_out':
      return 'timed_out';
    case 'canceled':
    case 'canceling':
      return 'canceled';
    case 'skipped':
    case 'broken':
      return 'skipped';
    case 'running':
      return 'running';
    default:
      return HARD_FAILURE_STATES[job.state] === true ? 'failed' : 'pending';
  }
};

export interface LogTailSelection {
  jobs: Job[];
  /** Eligible jobs left out by `MAX_LOG_TAIL_JOBS`. */
  skipped: number;
}

/** Jobs whose logs are worth fetching: final attempts that did not pass, hard failures first. */
export const selectLogTailJobs = (jobs: Job[]): LogTailSelection => {
  const eligible = jobs
    .filter(
      (job) =>
        isReportableJob(job) &&
        !job.retried &&
        (HARD_FAILURE_STATES[job.state] === true || job.soft_failed)
    )
    .sort((a, b) => Number(a.soft_failed) - Number(b.soft_failed));
  return {
    jobs: eligible.slice(0, MAX_LOG_TAIL_JOBS),
    skipped: Math.max(0, eligible.length - MAX_LOG_TAIL_JOBS),
  };
};

const durationMs = (start: string | null, end: string | null): number | null =>
  start && end ? new Date(end).getTime() - new Date(start).getTime() : null;

export const collectSummary = ({
  build,
  success,
  testFailures,
  logs,
  complete,
  now,
}: CollectInput): CiSummary => {
  const failuresByJob = new Map<string, TestFailure[]>();
  for (const failure of testFailures) {
    const list = failuresByJob.get(failure.jobId) ?? [];
    list.push(failure);
    failuresByJob.set(failure.jobId, list);
  }

  const jobs: CiSummaryJob[] = [];
  const summary = {
    total: 0,
    passed: 0,
    failed: 0,
    softFailed: 0,
    skipped: 0,
    canceled: 0,
    unfinished: 0,
    retried: 0,
  };

  for (const job of build.jobs) {
    if (!isReportableJob(job)) {
      continue;
    }

    const jobFailures = failuresByJob.get(job.id) ?? [];
    const state = toJobState(job);
    const failureKind = classifyJob(job, jobFailures.length);
    const log = logs.get(job.id);

    const entry: CiSummaryJob = {
      id: job.id,
      key: job.step_key,
      label: job.name,
      state,
      exitStatus: job.exit_status,
      softFailed: job.soft_failed,
      retried: job.retried,
      retryCount: job.retries_count ?? 0,
      durationMs: durationMs(job.started_at, job.finished_at),
      url: job.web_url,
      failureKind,
      failingSection: toPublicHeader(log?.failingSection ?? null),
    };

    if (jobFailures.length > 0) {
      const githubIssues = new Set<string>();
      for (const failure of jobFailures) {
        if (failure.githubIssue) {
          githubIssues.add(failure.githubIssue);
        }
      }
      entry.testFailures = {
        count: jobFailures.length,
        githubIssues: [...githubIssues].sort(),
        artifactGlob: `target/test_failures/${job.id}_*.json`,
      };
    }

    if (log?.logTailUrl) {
      entry.logTailUrl = log.logTailUrl;
    }

    jobs.push(entry);

    if (job.retried) {
      summary.retried++;
      continue;
    }

    summary.total++;
    switch (state) {
      case 'passed':
        summary.passed++;
        break;
      case 'running':
      case 'pending':
        summary.unfinished++;
        break;
      case 'soft_failed':
        summary.softFailed++;
        break;
      case 'skipped':
        summary.skipped++;
        break;
      case 'canceled':
        summary.canceled++;
        break;
      default:
        summary.failed++;
    }
  }

  const startedAt = build.started_at || null;
  // Post-Build runs while the build is still `running`; `now` stands in for finished_at.
  const finishedAt = build.finished_at || now.toISOString();
  const prNumber = build.pull_request?.id ? Number(build.pull_request.id) : null;

  return {
    schemaVersion: CI_SUMMARY_SCHEMA_VERSION,
    complete,
    generatedAt: now.toISOString(),
    build: {
      id: build.id,
      number: build.number,
      pipeline: build.pipeline.slug,
      url: build.web_url,
      branch: build.branch,
      commit: build.commit,
      prNumber: Number.isFinite(prNumber) ? prNumber : null,
      state: success ? 'passed' : 'failed',
      startedAt,
      finishedAt,
      durationMs: durationMs(startedAt, finishedAt),
    },
    summary,
    jobs,
  };
};

/**
 * Enforces the public size cap by dropping optional per-job detail (issue links first,
 * then log tail URLs). Returns the serialized manifest and whether anything was dropped.
 */
export const serializeWithinCap = (
  manifest: CiSummary,
  maxBytes = MAX_MANIFEST_BYTES
): { json: string; trimmed: boolean } => {
  let json = JSON.stringify(manifest, null, 2);
  if (Buffer.byteLength(json) <= maxBytes) {
    return { json, trimmed: false };
  }

  const trimmed: CiSummary = {
    ...manifest,
    complete: false,
    jobs: manifest.jobs.map((job) =>
      job.testFailures ? { ...job, testFailures: { ...job.testFailures, githubIssues: [] } } : job
    ),
  };
  json = JSON.stringify(trimmed, null, 2);
  if (Buffer.byteLength(json) <= maxBytes) {
    return { json, trimmed: true };
  }

  trimmed.jobs = trimmed.jobs.map(({ logTailUrl, ...job }) => job);
  json = JSON.stringify(trimmed, null, 2);
  if (Buffer.byteLength(json) <= maxBytes) {
    return { json, trimmed: true };
  }

  // Last resort: retried attempts are the least valuable rows.
  trimmed.jobs = trimmed.jobs.filter((job) => !job.retried);
  return { json: JSON.stringify(trimmed, null, 2), trimmed: true };
};
