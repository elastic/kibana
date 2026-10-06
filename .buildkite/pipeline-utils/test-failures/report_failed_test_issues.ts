/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execFileSync } from 'child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync } from 'fs';
import Path from 'path';
import { globby } from 'globby';
import { BuildkiteClient } from '../index.ts';
import type { Artifact } from '../buildkite/types/artifact.ts';
import type { Build } from '../buildkite/types/build.ts';
import type { Job } from '../buildkite/types/job.ts';
import type { TestFailure } from './annotate.ts';

const buildkite = new BuildkiteClient();

const JUNIT = 'target/junit/**/*.xml';
const SCOUT_DIR = '.scout/reports/scout-playwright-test-failures-';
const SCOUT = `${SCOUT_DIR}*/scout-failures-*.ndjson`;
const MAX_REPORTED_FAILURES = 50;

interface ReportingAttempt {
  job: Job;
  label: string;
  patterns: string[];
}

/** Groups the not yet reported attempts with test reports by step, oldest attempt first. */
export const getPendingSteps = (
  build: Pick<Build, 'jobs' | 'meta_data'>,
  artifacts: Artifact[]
): ReportingAttempt[][] => {
  // Retries of a step are reported together so the reporter reuses issues created by earlier attempts.
  const steps = new Map<string, ReportingAttempt[]>();
  for (const job of build.jobs) {
    const settings = build.meta_data[`${job.id}_github_test_reporting`];
    if (!settings) {
      continue;
    }
    const { scout, label }: { scout: boolean; label: string } = JSON.parse(settings);
    const paths = artifacts
      .filter((artifact) => artifact.job_id === job.id && artifact.state === 'finished')
      .map((artifact) => artifact.path);
    const patterns = [
      ...(paths.some((path) => /^target\/junit\/.*\.xml$/.test(path)) ? [JUNIT] : []),
      ...(scout && paths.some((path) => path.startsWith(SCOUT_DIR)) ? [SCOUT] : []),
    ];
    if (!patterns.length) {
      continue;
    }
    const stepId = `${job.step?.id ?? job.id}:${job.parallel_group_index ?? ''}`;
    steps.set(stepId, [...(steps.get(stepId) ?? []), { job, label, patterns }]);
  }

  return [...steps.values()].filter(
    (attempts) => !build.meta_data[`${attempts[attempts.length - 1].job.id}_github_test_reported`]
  );
};

/** Counts the JUnit and Scout failures in a directory of downloaded reports. */
export const countFailures = async (directory: string): Promise<number> => {
  let count = 0;
  for (const file of await globby([JUNIT, SCOUT], { cwd: directory, absolute: true })) {
    const content = readFileSync(file, 'utf8');
    count += file.endsWith('.xml')
      ? content.match(/<failure[\s>/]/g)?.length ?? 0
      : content.split('\n').filter(Boolean).length;
  }
  return count;
};

export const reportFailedTestIssues = async (): Promise<void> => {
  const build = await buildkite.getCurrentBuild(true);
  if (!build.jobs.some((job) => build.meta_data[`${job.id}_github_test_reporting`])) {
    return;
  }

  const pending = getPendingSteps(build, await buildkite.getArtifactsForCurrentBuild());
  if (!pending.length) {
    return;
  }

  mkdirSync('target', { recursive: true });
  const root = mkdtempSync(Path.resolve('target', 'failed-test-issues-'));
  let failureCount = 0;
  for (const attempts of pending) {
    for (const { job, patterns } of attempts) {
      const attemptDirectory = Path.join(root, 'attempts', job.id);
      mkdirSync(attemptDirectory, { recursive: true });
      for (const pattern of patterns) {
        execFileSync(
          '.buildkite/scripts/common/download_artifact.sh',
          [
            pattern === JUNIT ? 'target/junit/*.xml' : `${SCOUT_DIR}*/*`,
            attemptDirectory,
            '--step',
            job.id,
            '--include-retried-jobs',
          ],
          { stdio: 'inherit' }
        );
      }
      failureCount += await countFailures(attemptDirectory);
      // Report filenames are unique per attempt; fail rather than overwrite an earlier attempt's report
      cpSync(attemptDirectory, Path.join(root, attempts[attempts.length - 1].job.id), {
        recursive: true,
        force: false,
        errorOnExist: true,
      });
    }
  }

  if (failureCount > MAX_REPORTED_FAILURES) {
    buildkite.setAnnotation(
      'failed-test-github-issues',
      'error',
      `Skipped reporting ${failureCount} failed tests to GitHub (limit ${MAX_REPORTED_FAILURES}).`
    );
    throw new Error(`${failureCount} failed tests exceed the GitHub reporting limit`);
  }

  const reporter = Path.resolve('scripts/report_failed_tests.js');
  const links: string[] = [];
  let failedSteps = 0;
  for (const attempts of pending) {
    const { job, label } = attempts[attempts.length - 1];
    const directory = Path.join(root, job.id);
    try {
      execFileSync(
        process.execPath,
        [
          reporter,
          `--build-url=${build.web_url}#${job.id}`,
          '--no-index-errors',
          ...new Set(attempts.flatMap(({ patterns }) => patterns)),
        ],
        {
          cwd: directory,
          stdio: 'inherit',
          env: {
            ...process.env,
            REPORT_FAILED_TESTS_TO_GITHUB: 'true',
            BUILDKITE_JOB_ID: job.id,
            BUILDKITE_LABEL: label,
            BUILDKITE_PARALLEL_JOB: `${job.parallel_group_index ?? ''}`,
          },
        }
      );
      buildkite.setMetadata(`${job.id}_github_test_reported`, 'true');

      for (const file of await globby('target/test_failures/*.json', { cwd: directory })) {
        const { githubIssue }: TestFailure = JSON.parse(
          readFileSync(Path.join(directory, file), 'utf8')
        );
        if (githubIssue) {
          links.push(`[[issue]](${githubIssue}) [[job]](${build.web_url}#${job.id})`);
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
      `**GitHub failure issues**\n\n${[...new Set(links)].join('<br />\n')}`
    );
  }
  if (failedSteps) {
    throw new Error(`Failed to report failed tests for ${failedSteps} steps`);
  }
};
