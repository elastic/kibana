/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  KIBANA_DISTRIBUTABLE_ARTIFACT,
  createTimeBoundedClient,
  findBuildWithKibanaDistributable,
} from '#pipeline-utils';
import type { Build, BuildkiteClient } from '#pipeline-utils';

function log(message: string): void {
  console.error(message);
}

async function findMergeBaseBuild(
  client: BuildkiteClient,
  pipelineSlug: string,
  commit: string
): Promise<Build | null> {
  log(`--- Looking for ${KIBANA_DISTRIBUTABLE_ARTIFACT} on elastic/${pipelineSlug} at ${commit}`);

  const { data: builds } = await client.http.get<Build[]>(
    `v2/organizations/elastic/pipelines/${pipelineSlug}/builds`,
    { params: { commit, per_page: 10 } }
  );

  if (!Array.isArray(builds) || builds.length === 0) {
    log(`No ${pipelineSlug} build found for ${commit}`);
    return null;
  }

  // A commit can be built more than once (retries, manual rebuilds); the newest
  // build that still has the artifact wins.
  const build = await findBuildWithKibanaDistributable(client, pipelineSlug, builds);
  if (build) {
    return build;
  }

  log(
    `No ${KIBANA_DISTRIBUTABLE_ARTIFACT} on any ${pipelineSlug} build for ${commit}; it has likely expired`
  );
  return null;
}

async function main(): Promise<void> {
  const commit = process.env.GITHUB_PR_MERGE_BASE;
  if (!commit) {
    log('GITHUB_PR_MERGE_BASE is not set; cannot resolve a baseline build');
    return;
  }

  const pipelineSlug = process.env.WARM_START_MEMORY_BASELINE_PIPELINE || 'kibana-on-merge';

  try {
    const build = await findMergeBaseBuild(createTimeBoundedClient(), pipelineSlug, commit);
    if (!build) {
      return;
    }

    log(`--- Baseline distributable from ${pipelineSlug} #${build.number} (${build.web_url})`);

    // Sole stdout line for the bash wrapper to parse.
    process.stdout.write(`${build.id}\n`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(`Baseline build lookup failed (${message}); skipping the warm-start memory benchmark`);
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  log(`Unexpected baseline build lookup error (${message}); skipping the benchmark`);
  process.exit(0);
});
