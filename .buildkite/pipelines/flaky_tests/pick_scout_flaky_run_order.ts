/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execFileSync } from 'child_process';
import path from 'path';
import {
  getKibanaDir,
  getRequiredEnv,
  pickScoutFlakyRunOrder,
  type ScoutFlakyRequest,
} from '#pipeline-utils';

// Resolve ONLY the requested configs (scoped `discover-playwright-configs --configs <paths>`)
// instead of the whole repo: keeps the flaky runner fast and immune to unrelated/broken
// configs. It writes the manifest we read below to plan per-(arch, domain) Buildkite steps.
const MANIFEST_RELATIVE_PATH = path.join('.scout', 'test_configs', 'scout_playwright_configs.json');

const normalizeConfigPath = (configPath: string): string => configPath.replace(/^\.\//, '');

const resolveRequestedScoutConfigs = (
  kibanaDir: string,
  requests: ScoutFlakyRequest[],
  discoveryTarget: string
): void => {
  const requestedConfigs = [
    ...new Set(
      requests
        .map((req) => req?.scoutConfig)
        .filter((configPath): configPath is string => !!configPath)
        .map(normalizeConfigPath)
    ),
  ];

  if (requestedConfigs.length === 0) {
    return;
  }

  console.log(`--- Resolving ${requestedConfigs.length} requested Scout config(s)`);
  execFileSync(
    'node',
    [
      'scripts/scout',
      'discover-playwright-configs',
      '--target',
      discoveryTarget,
      '--configs',
      requestedConfigs.join(','),
      '--save',
    ],
    { cwd: kibanaDir, stdio: 'inherit' }
  );
};

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

(async () => {
  try {
    const requests = parseRequests(getRequiredEnv('SCOUT_FLAKY_REQUESTS'));
    const concurrency = parseInt(process.env.SCOUT_FLAKY_CONCURRENCY ?? '25', 10);
    if (Number.isNaN(concurrency)) {
      throw new Error(`Invalid SCOUT_FLAKY_CONCURRENCY: ${process.env.SCOUT_FLAKY_CONCURRENCY}`);
    }
    const reservedJobs = parseInt(process.env.SCOUT_FLAKY_RESERVED_JOBS ?? '0', 10);
    if (Number.isNaN(reservedJobs) || reservedJobs < 0) {
      throw new Error(
        `Invalid SCOUT_FLAKY_RESERVED_JOBS: ${process.env.SCOUT_FLAKY_RESERVED_JOBS}`
      );
    }
    const concurrencyGroup = process.env.SCOUT_FLAKY_CONCURRENCY_GROUP || undefined;

    const kibanaDir = getKibanaDir();

    // Scope discovery to the requested configs and write the manifest the planner reads.
    resolveRequestedScoutConfigs(kibanaDir, requests, getRequiredEnv('SCOUT_DISCOVERY_TARGET'));

    const manifestPath = path.resolve(kibanaDir, MANIFEST_RELATIVE_PATH);

    await pickScoutFlakyRunOrder(manifestPath, requests, {
      concurrency,
      concurrencyGroup,
      reservedJobs,
    });
  } catch (ex) {
    console.error(`+++ Scout flaky planner error: ${ex.message}`);
    process.exit(1);
  }
})();
