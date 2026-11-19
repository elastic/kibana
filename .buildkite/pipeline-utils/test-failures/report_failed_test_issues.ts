/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execFileSync } from 'child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'fs';
import Path from 'path';
import { globby } from 'globby';
import { BuildkiteClient } from '../index.ts';
import type { Build } from '../buildkite/types/build.ts';
import type { Job } from '../buildkite/types/job.ts';
import type { TestFailure } from './annotate.ts';

const buildkite = new BuildkiteClient();

const SCOUT_DIR = '.scout/reports/scout-playwright-test-failures-';
const REPORTS = {
  junit: { download: 'target/junit/*.xml', glob: 'target/junit/**/*.xml' },
  scout: { download: `${SCOUT_DIR}*/*`, glob: `${SCOUT_DIR}*/scout-failures-*.ndjson` },
} as const;
const MAX_REPORTED_FAILURES = 50;

/** What a failed test job recorded about its reports in post_command.sh. */
interface ReportingAttempt {
  job: Job;
  junit: boolean;
  scout: boolean;
  failures: number;
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

  const failureCount = pending.flat().reduce((sum, { failures }) => sum + failures, 0);
  if (failureCount > MAX_REPORTED_FAILURES) {
    buildkite.setAnnotation(
      'failed-test-github-issues',
      'error',
      `Skipped reporting ${failureCount} failed tests to GitHub (limit ${MAX_REPORTED_FAILURES}).`
    );
    throw new Error(`${failureCount} failed tests exceed the GitHub reporting limit`);
  }

  mkdirSync('target', { recursive: true });
  const root = mkdtempSync(Path.resolve('target', 'failed-test-issues-'));
  const reporter = Path.resolve('scripts/report_failed_tests.js');
  const links: string[] = [];
  let failedSteps = 0;
  for (const attempts of pending) {
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

      for (const file of await globby('target/test_failures/*.json', { cwd: directory })) {
        const { githubIssue, jobId }: TestFailure = JSON.parse(
          readFileSync(Path.join(directory, file), 'utf8')
        );
        if (githubIssue) {
          links.push(`[[issue]](${githubIssue}) [[job]](${build.web_url}#${jobId})`);
        }
      }
    } catch (error) {
      console.error(`Failed to report failed tests for job ${job.id}`, error);
      failedSteps += 1;
    }
  }

  if (links.length) {
    buildkite.setAnnotation(
      'failed-test-github-issues',
      'error',
      `**GitHub failure issues**\n\n${[...new Set(links)].join('<br />\n')}`,
      true
    );
  }
  if (failedSteps) {
    throw new Error(`Failed to report failed tests for ${failedSteps} steps`);
  }
};
