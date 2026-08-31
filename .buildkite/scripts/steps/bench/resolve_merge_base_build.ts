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

const ARTIFACT_NAME = 'kibana-default.tar.zst';
const REQUEST_TIMEOUT_MS = 30_000;

function log(message: string): void {
  console.error(message);
}

function createClient(): BuildkiteClient {
  const client = new BuildkiteClient();
  // BuildkiteClient's axios instance has no default timeout; bound requests so a
  // stalled API call skips the benchmark instead of hanging the step.
  client.http.defaults.timeout = REQUEST_TIMEOUT_MS;
  return client;
}

async function buildHasArtifact(
  client: BuildkiteClient,
  pipelineSlug: string,
  buildNumber: number
): Promise<boolean> {
  // First page only: kibana-default.tar.zst is uploaded with the distro and
  // appears early. Avoid getArtifacts() — it drains up to 50 pages of junit
  // noise per candidate (30+ pages on a typical kibana-on-merge build).
  const { data: artifacts } = await client.http.get<Array<{ filename: string; path?: string }>>(
    `v2/organizations/elastic/pipelines/${pipelineSlug}/builds/${buildNumber}/artifacts`,
    { params: { per_page: 100 } }
  );

  return (artifacts ?? []).some(
    (artifact) =>
      artifact.filename === ARTIFACT_NAME || (artifact.path ?? '').endsWith(ARTIFACT_NAME)
  );
}

async function findMergeBaseBuild(
  client: BuildkiteClient,
  pipelineSlug: string,
  commit: string
): Promise<Build | null> {
  log(`--- Looking for ${ARTIFACT_NAME} on elastic/${pipelineSlug} at ${commit}`);

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
  for (const build of builds) {
    try {
      if (await buildHasArtifact(client, pipelineSlug, build.number)) {
        return build;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log(`Artifact lookup failed for ${pipelineSlug} #${build.number}: ${message}`);
    }
  }

  log(`No ${ARTIFACT_NAME} on any ${pipelineSlug} build for ${commit}; it has likely expired`);
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
    const build = await findMergeBaseBuild(createClient(), pipelineSlug, commit);
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
