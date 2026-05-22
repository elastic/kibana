/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BuildkiteClient } from '#pipeline-utils';
import type { Build } from '#pipeline-utils';

interface RetriedJob {
  name: string;
  retryDurationMs: number;
  isPreemption: boolean;
}

const minutesFromMs = (ms: number): string => {
  const mins = Math.max(0, Math.round(ms / 60000));
  return mins === 1 ? '1 min' : `${mins} mins`;
};

const getRetryOverheadMs = (build: Build): { totalMs: number; retriedJobs: RetriedJob[] } => {
  const retriedJobs: RetriedJob[] = [];

  const retriedOriginals = build.jobs.filter((j) => j.retried && j.type === 'script');

  for (const original of retriedOriginals) {
    const retry = build.jobs.find(
      (j) => j.id === original.retried_in_job_id && j.type === 'script'
    );
    if (!retry || !retry.started_at || !retry.finished_at) {
      continue;
    }

    const retryDurationMs =
      new Date(retry.finished_at).getTime() - new Date(retry.started_at).getTime();

    const isPreemption =
      original.exit_status === -1 && original.agent_query_rules?.includes('preemptible=true');

    retriedJobs.push({
      name: original.name || 'unknown',
      retryDurationMs,
      isPreemption,
    });
  }

  const totalMs = retriedJobs.reduce((sum, j) => sum + j.retryDurationMs, 0);
  return { totalMs, retriedJobs };
};

const formatTimingSummary = (build: Build, now: Date): string => {
  const startedAt = new Date(build.started_at);
  // The Post-Build step runs while the build is still in progress, so
  // build.finished_at is null at that point. Use `now` as the approximate
  // finish time in that case so we still emit a useful duration.
  const finishedAt = build.finished_at ? new Date(build.finished_at) : now;
  const totalDurationMs = finishedAt.getTime() - startedAt.getTime();

  const { totalMs: retryOverheadMs, retriedJobs } = getRetryOverheadMs(build);
  const retryCount = retriedJobs.length;
  const preemptionCount = retriedJobs.filter((j) => j.isPreemption).length;
  const testFailureRetryCount = retryCount - preemptionCount;

  let summary = `**Build duration**: ${minutesFromMs(totalDurationMs)}`;

  if (retryCount > 0) {
    const parts: string[] = [];

    if (preemptionCount > 0) {
      parts.push(`${preemptionCount} agent preemption${preemptionCount > 1 ? 's' : ''}`);
    }
    if (testFailureRetryCount > 0) {
      parts.push(`${testFailureRetryCount} test failure${testFailureRetryCount > 1 ? 's' : ''}`);
    }

    summary += ` · includes ~${minutesFromMs(retryOverheadMs)} of retry overhead (${parts.join(
      ', '
    )})`;
  }

  return summary;
};

(async () => {
  try {
    const client = new BuildkiteClient();
    const build = await client.getCurrentBuild(true);

    if (!build.started_at) {
      console.log('Build timing not available (missing start timestamp)');
      process.exit(0);
    }

    const summary = formatTimingSummary(build, new Date());
    client.setMetadata('pr_comment:build_timing:body', summary);
    console.log('Build timing summary:', summary);
  } catch (ex: any) {
    console.error('Build timing error:', ex.message);
  }
})();
