/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Build } from '#pipeline-utils';

export const SCHEDULED_BUILDS_MESSAGE_PREFIX = 'Scheduled QA Smoke Tests';
export const QUALITY_GATE_BUILDS_MESSAGE_SUFFIX = '(triggered by pipeline.tests-qa.yaml)';

export interface CheckWindow {
  // exclusive
  start: Date;
  // inclusive
  end: Date;
}

export function filterFinishedMainBuilds(builds: Build[]): Build[] {
  return builds.filter(
    (build) => ['passed', 'failed'].includes(build.state) && build.branch === 'main'
  );
}

// Returns failed quality gate builds that finished within the check window.
// Consecutive check windows do not overlap, so each failed build is reported once.
export function findQualityGateFailures(builds: Build[], window: CheckWindow): Build[] {
  return builds.filter((build) => {
    if (build.state !== 'failed' || !build.message?.includes(QUALITY_GATE_BUILDS_MESSAGE_SUFFIX)) {
      return false;
    }
    const finishedAt = new Date(build.finished_at).getTime();
    return finishedAt > window.start.getTime() && finishedAt <= window.end.getTime();
  });
}

// Returns the last `threshold` scheduled builds if they all failed, otherwise an empty array.
// Expects builds sorted newest first.
export function findConsecutiveScheduledFailures(builds: Build[], threshold: number): Build[] {
  const recentBuilds = builds
    .filter((build) => build.message?.includes(SCHEDULED_BUILDS_MESSAGE_PREFIX))
    .slice(0, threshold);

  const allFailed =
    recentBuilds.length === threshold && recentBuilds.every((build) => build.state === 'failed');

  return allFailed ? recentBuilds : [];
}
