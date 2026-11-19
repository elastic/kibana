/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execFileSync } from 'child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'fs';
import Path from 'path';
import { globby } from 'globby';
import { BuildkiteClient } from '../index.ts';
import type { Build } from '../buildkite/types/build.ts';
import type { Job } from '../buildkite/types/job.ts';
import { annotateTestFailures } from './annotate.ts';

const buildkite = new BuildkiteClient();

const SCOUT_DIR = '.scout/reports/scout-playwright-test-failures-';
const REPORTS = {
  junit: { download: 'target/junit/*.xml', glob: 'target/junit/**/*.xml' },
  scout: { download: `${SCOUT_DIR}*/*`, glob: `${SCOUT_DIR}*/scout-failures-*.ndjson` },
} as const;
const MAX_REPORTED_FAILURES = 20;

/** What a failed test job recorded about its reports in post_command.sh. */
interface ReportingAttempt {
  job: Job;
  junit: boolean;
  scout: boolean;
}

/** Groups the not yet reported attempts with test reports by step, oldest attempt first. */
export const getPendingSteps = (build: Pick<Build, 'jobs' | 'meta_data'>): ReportingAttempt[][] => {
  // Retries of a step are reported together so the reporter reuses issues created by earlier attempts.
  const steps = new Map<string, ReportingAttempt[]>();
  for (const job of build.jobs) {
    const settings = build.meta_data[`${job.id}_github_test_reporting`];
    if (!settings) {
      continue;
    }
    const stepId = `${job.step?.id ?? job.id}:${job.parallel_group_index ?? ''}`;
    steps.set(stepId, [...(steps.get(stepId) ?? []), { job, ...JSON.parse(settings) }]);
  }

  return [...steps.values()]
    .map((attempts) =>
      // The API does not document the order of a step's attempts.
      attempts.sort((a, b) => a.job.created_at.localeCompare(b.job.created_at))
    )
    .map((attempts) =>
      attempts.slice(
        attempts.findLastIndex(({ job }) => build.meta_data[`${job.id}_github_test_reported`]) + 1
      )
    )
    .filter((attempts) => attempts.length);
};

export const reportFailedTestIssues = async (): Promise<void> => {
  const build = await buildkite.getCurrentBuild(true);
  const pending = getPendingSteps(build);
  if (!pending.length) {
    return;
  }

  mkdirSync('target', { recursive: true });
  const root = mkdtempSync(Path.resolve('target', 'failed-test-issues-'));
  const reporter = Path.resolve('scripts/report_failed_tests.js');
  const reportedFiles: string[] = [];
  let failedSteps = 0;
  let failureCount = 0;
  let skippedSteps = 0;
  for (const attempts of pending) {
    // Mass failures would exhaust the GitHub rate limit, the remaining steps are left unreported.
    if (failureCount >= MAX_REPORTED_FAILURES) {
      skippedSteps += 1;
      continue;
    }
    const { job } = attempts[attempts.length - 1];
    const directory = Path.join(root, job.id);
    try {
      const origins: Record<string, object> = {};
      const globs = new Set<string>();
      for (const attempt of attempts) {
        const { id, name, parallel_group_index: parallelIndex } = attempt.job;
        const attemptDirectory = Path.join(directory, 'attempts', id);
        mkdirSync(attemptDirectory, { recursive: true });
        for (const kind of ['junit', 'scout'] as const) {
          if (!attempt[kind]) {
            continue;
          }
          execFileSync(
            '.buildkite/scripts/common/download_artifact.sh',
            [REPORTS[kind].download, attemptDirectory, '--step', id, '--include-retried-jobs'],
            { stdio: 'inherit' }
          );
          globs.add(`attempts/*/${REPORTS[kind].glob}`);
        }
        origins[attemptDirectory] = {
          buildId: build.id,
          jobId: id,
          url: build.web_url,
          jobUrl: `${build.web_url}#${id}`,
          jobName: name + (typeof parallelIndex === 'number' ? ` #${parallelIndex + 1}` : ''),
        };
      }
      const metadataPath = Path.join(directory, 'report-job-metadata.json');
      writeFileSync(metadataPath, JSON.stringify(origins));

      execFileSync(
        process.execPath,
        [
          reporter,
          `--build-url=${build.web_url}#${job.id}`,
          `--report-job-metadata=${metadataPath}`,
          '--no-index-errors',
          ...globs,
        ],
        {
          cwd: directory,
          stdio: 'inherit',
          env: {
            ...process.env,
            REPORT_FAILED_TESTS_TO_GITHUB: 'true',
            BUILDKITE_JOB_ID: job.id,
            BUILDKITE_LABEL: job.name,
            BUILDKITE_PARALLEL_JOB: `${job.parallel_group_index ?? ''}`,
          },
        }
      );
      buildkite.setMetadata(`${job.id}_github_test_reported`, 'true');

      const failures = await globby('target/test_failures/*.json', {
        cwd: directory,
        absolute: true,
      });
      failureCount += failures.length;
      reportedFiles.push(...failures);
    } catch (error) {
      console.error(`Failed to report failed tests for job ${job.id}`, error);
      failedSteps += 1;
    }
  }

  if (reportedFiles.length) {
    // Refreshes the failure annotation, PR comment and Slack summary with the filed issues.
    try {
      await annotateTestFailures(reportedFiles);
    } catch (error) {
      console.error('Failed to refresh the test failure summaries', error);
    }
  }
  if (skippedSteps) {
    buildkite.setAnnotation(
      'failed-test-github-issues-limit',
      'warning',
      `Stopped reporting to GitHub after ${failureCount} failed tests, ${skippedSteps} steps were not reported.`
    );
  }
  // Reporting problems are annotated instead of thrown, so they never fail the build.
  if (failedSteps) {
    buildkite.setAnnotation(
      'failed-test-github-issues-errors',
      'warning',
      `Failed to report failed tests to GitHub for ${failedSteps} steps, see the Post-Build log.`
    );
  }
};
