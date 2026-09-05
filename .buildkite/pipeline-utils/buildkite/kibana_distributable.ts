/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BuildkiteClient } from './client';
import type { Build } from './types/build';

export const KIBANA_DISTRIBUTABLE_ARTIFACT = 'kibana-default.tar.zst';

const REQUEST_TIMEOUT_MS = 30_000;

/** A BuildkiteClient whose requests time out instead of hanging the step. */
export const createTimeBoundedClient = (
  timeoutMs: number = REQUEST_TIMEOUT_MS
): BuildkiteClient => {
  const client = new BuildkiteClient();
  // BuildkiteClient's axios instance has no default timeout; bound requests so a
  // stalled API call lets the caller fall back instead of hanging.
  client.http.defaults.timeout = timeoutMs;
  return client;
};

/** Whether a build still has the Kibana distributable attached to it. */
export const buildHasKibanaDistributable = async (
  client: BuildkiteClient,
  pipelineSlug: string,
  buildNumber: number
): Promise<boolean> => {
  // First page only: kibana-default.tar.zst is uploaded with the distro and
  // appears early. Avoid getArtifacts() — it drains up to 50 pages of junit
  // noise per candidate (30+ pages on a typical kibana-on-merge build).
  const { data: artifacts } = await client.http.get<Array<{ filename: string; path?: string }>>(
    `v2/organizations/elastic/pipelines/${pipelineSlug}/builds/${buildNumber}/artifacts`,
    { params: { per_page: 100 } }
  );

  return (artifacts ?? []).some(
    (artifact) =>
      artifact.filename === KIBANA_DISTRIBUTABLE_ARTIFACT ||
      (artifact.path ?? '').endsWith(KIBANA_DISTRIBUTABLE_ARTIFACT)
  );
};

/**
 * The first build in `builds` that still has the Kibana distributable, skipping
 * candidates whose artifact lookup fails.
 */
export const findBuildWithKibanaDistributable = async (
  client: BuildkiteClient,
  pipelineSlug: string,
  builds: Build[]
): Promise<Build | null> => {
  for (const build of builds) {
    try {
      if (await buildHasKibanaDistributable(client, pipelineSlug, build.number)) {
        return build;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Artifact lookup failed for ${pipelineSlug} #${build.number}: ${message}`);
    }
  }

  return null;
};
