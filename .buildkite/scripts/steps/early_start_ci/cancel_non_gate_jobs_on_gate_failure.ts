/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Job } from '#pipeline-utils';
import {
  BuildkiteClient,
  PR_CI_CANCELABLE_METADATA_SUFFIX,
  PR_CI_GATE_KEYS,
  isPrCiCancelableCommand,
  isPrCiCancelableJobState,
  isPrCiGateKey,
} from '#pipeline-utils';

const ANNOTATION_CONTEXT = 'pr-ci-early-start-gate-canceler';

const toStepLabel = (job: Job): string => job.step_key || job.name || job.id;

async function run() {
  const bk = new BuildkiteClient();
  const build = await bk.getCurrentBuild(true);

  const failedGateJobs = build.jobs.filter((job) => {
    if (!isPrCiGateKey(job.step_key)) {
      return false;
    }

    return !bk.getJobStatus(build, job).success;
  });

  if (failedGateJobs.length === 0) {
    bk.setAnnotation(
      ANNOTATION_CONTEXT,
      'info',
      `No gate failures detected. Gate keys checked: ${PR_CI_GATE_KEYS.join(', ')}`
    );
    return;
  }

  const candidateJobs = build.jobs.filter((job) => {
    if (!isPrCiCancelableJobState(job.state)) {
      return false;
    }

    if (job.id === process.env.BUILDKITE_JOB_ID) {
      return false;
    }

    const isMarkedByMetadata =
      bk.getMetadata(`${job.id}_${PR_CI_CANCELABLE_METADATA_SUFFIX}`, 'false') === 'true';

    return isMarkedByMetadata || isPrCiCancelableCommand(job.command || '');
  });

  if (candidateJobs.length === 0) {
    bk.setAnnotation(
      ANNOTATION_CONTEXT,
      'warning',
      [
        `Gate failure(s) detected: ${failedGateJobs.map(toStepLabel).join(', ')}`,
        'No active pr-ci-cancelable jobs were found.',
      ].join('\n')
    );
    return;
  }

  const canceledJobs: Job[] = [];
  const cancelFailures: string[] = [];

  for (const job of candidateJobs) {
    try {
      await bk.cancelJob(job.id);
      canceledJobs.push(job);
    } catch (error) {
      const message = error instanceof Error ? error.message : `${error}`;
      cancelFailures.push(`${toStepLabel(job)} (${job.id}): ${message}`);
    }
  }

  const summary = [
    `Gate failure(s) detected: ${failedGateJobs.map(toStepLabel).join(', ')}`,
    `Canceled ${canceledJobs.length} pr-ci-cancelable job(s): ${
      canceledJobs.length ? canceledJobs.map(toStepLabel).join(', ') : 'none'
    }`,
    ...(cancelFailures.length
      ? ['Failed to cancel:', ...cancelFailures.map((line) => `- ${line}`)]
      : []),
  ].join('\n');

  bk.setAnnotation(ANNOTATION_CONTEXT, cancelFailures.length ? 'warning' : 'info', summary);

  if (cancelFailures.length > 0) {
    throw new Error('Some pr-ci-cancelable jobs could not be canceled');
  }
}

run().catch((error) => {
  console.error('PR CI early-start gate-failure canceler failed:', error);
  process.exit(1);
});
