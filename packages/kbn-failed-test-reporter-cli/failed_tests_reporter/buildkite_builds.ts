/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolingLog } from '@kbn/tooling-log';

const BUILDKITE_API_URL = 'https://api.buildkite.com/v2/organizations/elastic';

/**
 * Which of the given builds of a pipeline Buildkite reports as finished, so a failure no retry
 * reported on can settle once nothing in the build can report it anymore. A build that cannot be
 * asked about is left pending; `BUILDKITE_TOKEN` is set in every CI job.
 */
export const fetchFinishedBuilds = async (
  pipeline: string,
  builds: readonly number[],
  log: ToolingLog,
  token: string | undefined = process.env.BUILDKITE_TOKEN
): Promise<Set<number>> => {
  const finished = new Set<number>();
  if (builds.length === 0) {
    return finished;
  }
  if (!token) {
    log.warning(`BUILDKITE_TOKEN is not set, builds ${builds.join(', ')} are left pending`);
    return finished;
  }
  await Promise.all(
    builds.map(async (build) => {
      try {
        const response = await fetch(`${BUILDKITE_API_URL}/pipelines/${pipeline}/builds/${build}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          log.warning(`Buildkite answered ${response.status} for build #${build}, left pending`);
          return;
        }
        const { finished_at: finishedAt } = (await response.json()) as {
          finished_at: string | null;
        };
        if (finishedAt) {
          finished.add(build);
        }
      } catch (error) {
        log.warning(`Could not ask Buildkite about build #${build}, left pending: ${error}`);
      }
    })
  );
  return finished;
};
