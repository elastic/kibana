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

const BUILDS_PER_PAGE = 30;

function log(message: string): void {
  console.error(message);
}

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function findReusableBuild(client: BuildkiteClient): Promise<Build | null> {
  const maxAgeHours = envInt('KIBANA_REUSE_BUILD_MAX_AGE_HOURS', 36);
  const sourcePipeline = process.env.KIBANA_REUSE_BUILD_PIPELINE || 'kibana-on-merge';
  const sourceBranch = process.env.KIBANA_REUSE_BUILD_BRANCH || 'main';
  const createdFrom = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000).toISOString();

  log(
    `--- Looking for reusable ${KIBANA_DISTRIBUTABLE_ARTIFACT} on elastic/${sourcePipeline} (${sourceBranch}, last ${maxAgeHours}h)`
  );

  const { data: builds } = await client.http.get<Build[]>(
    `v2/organizations/elastic/pipelines/${sourcePipeline}/builds`,
    {
      params: {
        branch: sourceBranch,
        per_page: BUILDS_PER_PAGE,
        created_from: createdFrom,
      },
    }
  );

  if (!Array.isArray(builds) || builds.length === 0) {
    log(`No recent ${sourcePipeline} builds found; will build Kibana from scratch`);
    return null;
  }

  log(
    `Checking ${builds.length} newest candidate build(s) for ${KIBANA_DISTRIBUTABLE_ARTIFACT}...`
  );

  const build = await findBuildWithKibanaDistributable(client, sourcePipeline, builds);
  if (build) {
    return build;
  }

  log(
    `No ${KIBANA_DISTRIBUTABLE_ARTIFACT} found on the newest ${builds.length} ${sourcePipeline} build(s); will build Kibana from scratch`
  );
  return null;
}

async function main(): Promise<void> {
  const sourcePipeline = process.env.KIBANA_REUSE_BUILD_PIPELINE || 'kibana-on-merge';
  const maxAgeHours = envInt('KIBANA_REUSE_BUILD_MAX_AGE_HOURS', 36);
  const client = createTimeBoundedClient();

  try {
    const reusable = await findReusableBuild(client);
    if (!reusable) {
      return;
    }

    log(`--- Reusing Kibana distributable from ${sourcePipeline} #${reusable.number}`);
    log(`KIBANA_BUILD_ID=${reusable.id}`);
    log(`Source: ${reusable.web_url}`);

    try {
      client.setAnnotation(
        'kibana-reusable-build',
        'info',
        [
          `This build is reusing the Kibana distributable from [${sourcePipeline} #${reusable.number}](${reusable.web_url}) (age ≤ ${maxAgeHours}h) instead of rebuilding.`,
          '',
          `\`KIBANA_BUILD_ID=${reusable.id}\``,
        ].join('\n')
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log(`Warning: failed to annotate build (${message})`);
    }

    // Sole stdout line for the bash wrapper to parse.
    process.stdout.write(`${reusable.id}\n`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(`Buildkite reusable-build lookup failed (${message}); will build Kibana from scratch`);
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  log(`Unexpected reusable-build lookup error (${message}); will build Kibana from scratch`);
  process.exit(0);
});
