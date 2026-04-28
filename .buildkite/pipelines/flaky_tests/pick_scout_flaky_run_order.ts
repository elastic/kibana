/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import { execFileSync } from 'child_process';
import {
  getKibanaDir,
  getRequiredEnv,
  pickScoutFlakyRunOrder,
  type ScoutFlakyRequest,
} from '#pipeline-utils';

const MANIFEST_ARTIFACT = 'scout_playwright_configs.json';

const parseRequests = (raw: string): ScoutFlakyRequest[] => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`SCOUT_FLAKY_REQUESTS is not valid JSON: ${(err as Error).message}`);
  }
  if (!Array.isArray(parsed)) {
    throw new Error(`SCOUT_FLAKY_REQUESTS must be a JSON array`);
  }
  return parsed as ScoutFlakyRequest[];
};

const downloadManifest = (destinationDir: string): string => {
  console.log(`--- Downloading Scout Playwright config manifest (${MANIFEST_ARTIFACT})`);
  execFileSync('buildkite-agent', ['artifact', 'download', MANIFEST_ARTIFACT, destinationDir], {
    stdio: ['ignore', 'inherit', 'inherit'],
  });
  return path.resolve(destinationDir, MANIFEST_ARTIFACT);
};

(async () => {
  try {
    const requests = parseRequests(getRequiredEnv('SCOUT_FLAKY_REQUESTS'));
    const concurrency = parseInt(process.env.SCOUT_FLAKY_CONCURRENCY ?? '25', 10);
    if (Number.isNaN(concurrency)) {
      throw new Error(`Invalid SCOUT_FLAKY_CONCURRENCY: ${process.env.SCOUT_FLAKY_CONCURRENCY}`);
    }
    const concurrencyGroup = process.env.SCOUT_FLAKY_CONCURRENCY_GROUP || undefined;

    const manifestPath = downloadManifest(getKibanaDir());

    await pickScoutFlakyRunOrder(manifestPath, requests, {
      concurrency,
      concurrencyGroup,
    });
  } catch (ex) {
    console.error(`+++ Scout flaky planner error: ${ex.message}`);
    process.exit(1);
  }
})();
