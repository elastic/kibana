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

const minutesFromMs = (ms: number): string => {
  const mins = Math.max(0, Math.round(ms / 60000));
  return mins === 1 ? '1 min' : `${mins} mins`;
};

const formatTimingSummary = (build: Build, now: Date): string => {
  const startedAt = new Date(build.started_at);
  // The Post-Build step runs while the build is still in progress, so
  // build.finished_at is null at that point. Use `now` as the approximate
  // finish time in that case so we still emit a useful duration.
  const finishedAt = build.finished_at ? new Date(build.finished_at) : now;
  const totalDurationMs = finishedAt.getTime() - startedAt.getTime();

  return `* Build duration: ${minutesFromMs(totalDurationMs)}`;
};

(async () => {
  try {
    const client = new BuildkiteClient();
    const build = await client.getCurrentBuild();

    if (!build.started_at) {
      console.log('Build timing not available (missing start timestamp)');
      process.exit(0);
    }

    const summary = formatTimingSummary(build, new Date());
    client.setMetadata('pr_comment:build_timing:head', summary);
    console.log('Build timing summary:', summary);
  } catch (ex: any) {
    console.error('Build timing error:', ex.message);
  }
})();
