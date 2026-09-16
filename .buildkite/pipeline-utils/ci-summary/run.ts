/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { BuildkiteClient } from '../buildkite/client.ts';
import type { Artifact } from '../buildkite/types/artifact.ts';
import type { Build } from '../buildkite/types/build.ts';
import type { Job } from '../buildkite/types/job.ts';
import { loadTestFailures, type TestFailure } from '../test-failures/annotate.ts';
import {
  collectSummary,
  LOG_FETCH_BUDGET_MS,
  LOG_TAIL_LINES,
  MAX_LOG_BYTES,
  selectLogTailJobs,
  serializeWithinCap,
  type JobLogInfo,
} from './collect.ts';
import { extractFailingSection } from './log_sections.ts';
import {
  CI_SUMMARY_BUCKET,
  CI_SUMMARY_PREFIX,
  CI_SUMMARY_SCHEMA_VERSION,
  getCiSummaryPrUrl,
  getCiSummaryUrl,
  type CiSummary,
} from './types.ts';

const ACTIVATE_SA = '.buildkite/scripts/common/activate_service_account.sh';
const DOWNLOAD_ARTIFACT = '.buildkite/scripts/common/download_artifact.sh';
const TEST_FAILURE_ARTIFACT_RE = /^target\/test_failures\/.*\.json$/;
const MAX_SINGLE_LOG_TIMEOUT_MS = 60 * 1000;

export interface BuildSummaryDeps {
  client: BuildkiteClient;
  /** Runs an executable; throws on non-zero exit. */
  run: (file: string, args: string[]) => void;
  env: NodeJS.ProcessEnv;
  now: () => Date;
  /** Absolute path to `schema.json`, uploaded alongside the manifest. */
  schemaPath: string;
  /** Relative to cwd; Buildkite records artifact paths relative to cwd too. */
  outDir?: string;
  log?: (message: string) => void;
}

export interface BuildSummaryResult {
  manifest: CiSummary;
  url: string;
}

const downloadTestFailures = (
  deps: Required<Pick<BuildSummaryDeps, 'run' | 'log'>>,
  artifacts: Artifact[],
  dir: string
): { failures: TestFailure[]; ok: boolean } => {
  if (!artifacts.some((artifact) => TEST_FAILURE_ARTIFACT_RE.test(artifact.path))) {
    return { failures: [], ok: true };
  }
  mkdirSync(dir, { recursive: true });
  try {
    deps.run(DOWNLOAD_ARTIFACT, ['--include-retried-jobs', 'target/test_failures/*.json', dir]);
  } catch (ex) {
    deps.log(`Test failure artifacts exist but could not be downloaded: ${(ex as Error).message}`);
    return { failures: [], ok: false };
  }
  return { failures: loadTestFailures(dir), ok: true };
};

const fetchLogTails = async (
  deps: Required<Pick<BuildSummaryDeps, 'client' | 'now' | 'log'>>,
  build: Build,
  jobs: Job[],
  logsDir: string
): Promise<{ logs: Map<string, JobLogInfo>; ok: boolean }> => {
  const logs = new Map<string, JobLogInfo>();
  let ok = true;
  const deadline = deps.now().getTime() + LOG_FETCH_BUDGET_MS;
  mkdirSync(logsDir, { recursive: true });

  for (const job of jobs) {
    const remaining = deadline - deps.now().getTime();
    if (remaining <= 0) {
      deps.log(`Log fetch budget exhausted; skipping ${job.name} and later jobs`);
      ok = false;
      break;
    }
    try {
      const raw = await deps.client.getJobLog(build.pipeline.slug, build.number, job.id, {
        maxBytes: MAX_LOG_BYTES,
        timeoutMs: Math.min(remaining, MAX_SINGLE_LOG_TIMEOUT_MS),
      });
      const section = extractFailingSection(raw, LOG_TAIL_LINES);
      writeFileSync(join(logsDir, `${job.id}.txt`), section.tail.join('\n') + '\n');
      logs.set(job.id, { failingSection: section.header });
    } catch (ex) {
      ok = false;
      deps.log(`Failed to fetch log for job ${job.id} (${job.name}): ${(ex as Error).message}`);
    }
  }

  return { logs, ok };
};

const resolveLogTailUrls = async (
  client: BuildkiteClient,
  build: Build,
  currentJobId: string | undefined,
  logsDir: string,
  logs: Map<string, JobLogInfo>
): Promise<void> => {
  if (logs.size === 0) {
    return;
  }
  client.uploadArtifacts(`${logsDir}/*.txt`);

  for (const artifact of await client.getArtifacts(build.pipeline.slug, build.number)) {
    if (artifact.job_id !== currentJobId || !artifact.path.startsWith(`${logsDir}/`)) {
      continue;
    }
    const info = logs.get(artifact.filename.replace(/\.txt$/, ''));
    if (info) {
      info.logTailUrl = `https://buildkite.com/organizations/elastic/pipelines/${build.pipeline.slug}/builds/${build.number}/jobs/${currentJobId}/artifacts/${artifact.id}`;
    }
  }
};

const publish = (
  run: BuildSummaryDeps['run'],
  summaryPath: string,
  schemaPath: string,
  buildId: string,
  prNumber: number | null
): void => {
  const root = `gs://${CI_SUMMARY_BUCKET}/${CI_SUMMARY_PREFIX}`;
  run(ACTIVATE_SA, [`gs://${CI_SUMMARY_BUCKET}`]);
  try {
    run('gcloud', [
      'storage',
      'cp',
      '--no-user-output-enabled',
      summaryPath,
      `${root}/build/${buildId}.json`,
    ]);
    run('gcloud', [
      'storage',
      'cp',
      '--no-user-output-enabled',
      schemaPath,
      `${root}/schema/v${CI_SUMMARY_SCHEMA_VERSION}.json`,
    ]);
    if (prNumber !== null) {
      run('gcloud', [
        'storage',
        'cp',
        '--cache-control=no-cache, max-age=0, no-transform',
        '--no-user-output-enabled',
        summaryPath,
        `${root}/pr/${prNumber}/latest.json`,
      ]);
    }
  } finally {
    run(ACTIVATE_SA, ['--unset-impersonation']);
  }
};

/** Builds, uploads and publishes the CI summary for the current build. */
export const runBuildSummary = async (deps: BuildSummaryDeps): Promise<BuildSummaryResult> => {
  const { client, run, env, now, schemaPath } = deps;
  const outDir = deps.outDir ?? 'target/ci-summary';
  const log = deps.log ?? console.log;
  const logsDir = join(outDir, 'logs');
  const summaryPath = join(outDir, 'summary.json');
  mkdirSync(outDir, { recursive: true });

  const { BUILDKITE_PIPELINE_SLUG: slug, BUILDKITE_BUILD_NUMBER: number } = env;
  if (!slug || !number) {
    throw new Error('BUILDKITE_PIPELINE_SLUG and BUILDKITE_BUILD_NUMBER must be set');
  }
  const build = await client.getBuild(slug, number, true);
  const { success } = client.getBuildStatus(build);
  const existingArtifacts = await client.getArtifacts(slug, number);

  const testFailures = downloadTestFailures(
    { run, log },
    existingArtifacts,
    join(outDir, 'test_failures')
  );
  const selection = selectLogTailJobs(build.jobs);
  if (selection.skipped > 0) {
    log(`${selection.skipped} failed job(s) beyond the log tail cap; their logs were not fetched`);
  }
  const fetched = await fetchLogTails({ client, now, log }, build, selection.jobs, logsDir);
  await resolveLogTailUrls(client, build, env.BUILDKITE_JOB_ID, logsDir, fetched.logs);

  const manifest = collectSummary({
    build,
    success,
    testFailures: testFailures.failures,
    logs: fetched.logs,
    complete: testFailures.ok && fetched.ok && selection.skipped === 0,
    now: now(),
  });
  const { json, trimmed } = serializeWithinCap(manifest);
  if (trimmed) {
    log('CI summary exceeded size cap; optional detail was trimmed');
  }
  writeFileSync(summaryPath, json);

  const { prNumber } = manifest.build;
  publish(run, summaryPath, schemaPath, build.id, prNumber);

  if (prNumber !== null) {
    client.setMetadata(
      'pr_comment:ci_summary:head',
      `* [CI Summary](${getCiSummaryPrUrl(prNumber)})`
    );
  }

  return { manifest: JSON.parse(json), url: getCiSummaryUrl(build.id) };
};
