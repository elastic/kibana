/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import {
  getKibanaDir,
  getRequiredEnv,
  pickScoutFlakyRunOrder,
  type ScoutFlakyRequest,
} from '#pipeline-utils';

// The manifest is produced earlier in the same step by `discover_and_plan_flaky.sh`
// (which runs `scout discover-playwright-configs --save`); we read it directly from
// disk rather than going through a BK artifact round-trip.
const MANIFEST_RELATIVE_PATH = path.join('.scout', 'test_configs', 'scout_playwright_configs.json');

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

    const manifestPath = path.resolve(getKibanaDir(), MANIFEST_RELATIVE_PATH);

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
