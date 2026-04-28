/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import Path from 'path';
import { execFileSync } from 'child_process';

import {
  BuildkiteClient,
  collectEnvFromLabels,
  expandAgentQueue,
  type BuildkiteCommandStep,
} from '#pipeline-utils';
import { TestSuiteType } from './constants';

interface ScoutFlakyRequest {
  type: 'scoutConfig';
  scoutConfig: string;
  count: number;
}

interface ManifestConfigEntry {
  path: string;
  hasTests: boolean;
  tags: string[];
  serverRunFlags: string[];
  usesParallelWorkers: boolean;
}

interface ManifestModule {
  name: string;
  group: string;
  type: 'plugin' | 'package';
  configs: ManifestConfigEntry[];
}

const MANIFEST_FILE = 'scout_playwright_configs.json';
// Hard ceiling on total Buildkite jobs in a single build; mirrors the value in pipeline.ts.
// Validated here AFTER fan-out across (arch, domain) modes so the user gets a precise count.
const MAX_JOBS = 500;

const fail = (message: string): never => {
  console.error(`+++ ${message}`);
  process.exit(1);
};

const parseRequests = (): ScoutFlakyRequest[] => {
  const raw = process.env.SCOUT_FLAKY_REQUESTS;
  if (!raw) {
    fail('SCOUT_FLAKY_REQUESTS env var is missing');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw as string);
  } catch (err) {
    return fail(`SCOUT_FLAKY_REQUESTS is not valid JSON: ${(err as Error).message}`);
  }
  if (!Array.isArray(parsed)) {
    return fail(`SCOUT_FLAKY_REQUESTS must be a JSON array`);
  }
  return parsed as ScoutFlakyRequest[];
};

const downloadManifest = (): ManifestModule[] => {
  console.log(`--- Downloading Scout Playwright config manifest (${MANIFEST_FILE})`);
  try {
    execFileSync('buildkite-agent', ['artifact', 'download', MANIFEST_FILE, '.'], {
      stdio: ['ignore', 'inherit', 'inherit'],
    });
  } catch (err) {
    return fail(
      `Failed to download '${MANIFEST_FILE}' artifact from the discovery step: ${
        (err as Error).message
      }`
    );
  }

  const manifestPath = Path.resolve(MANIFEST_FILE);
  if (!Fs.existsSync(manifestPath)) {
    return fail(`Manifest '${MANIFEST_FILE}' is missing after download`);
  }

  try {
    return JSON.parse(Fs.readFileSync(manifestPath, 'utf-8')) as ManifestModule[];
  } catch (err) {
    return fail(`Failed to parse '${MANIFEST_FILE}': ${(err as Error).message}`);
  }
};

const indexConfigs = (manifest: ManifestModule[]): Map<string, ManifestConfigEntry> => {
  const map = new Map<string, ManifestConfigEntry>();
  for (const module of manifest) {
    for (const config of module.configs) {
      map.set(config.path, config);
    }
  }
  return map;
};

// Normalize "./foo/bar.config.ts" -> "foo/bar.config.ts" so it matches manifest entries.
const normalizeConfigPath = (path: string): string => path.replace(/^\.\//, '');

const buildSteps = (
  requests: ScoutFlakyRequest[],
  configIndex: Map<string, ManifestConfigEntry>,
  options: {
    concurrency: number;
    concurrencyGroup?: string;
    extraEnv: Record<string, string>;
  }
): BuildkiteCommandStep[] => {
  const steps: BuildkiteCommandStep[] = [];
  let suiteIndex = 0;
  let totalJobs = 0;

  for (const req of requests) {
    if (!req || req.type !== 'scoutConfig') {
      throw new Error(`Unexpected request entry: ${JSON.stringify(req)}`);
    }
    if (!req.scoutConfig || typeof req.scoutConfig !== 'string') {
      throw new Error(`Request is missing 'scoutConfig' string: ${JSON.stringify(req)}`);
    }
    if (typeof req.count !== 'number' || req.count <= 0) {
      throw new Error(`Request 'count' must be a positive number: ${JSON.stringify(req)}`);
    }

    const normalized = normalizeConfigPath(req.scoutConfig);
    const entry = configIndex.get(normalized);

    if (!entry) {
      throw new Error(
        `scoutConfig '${normalized}' not found in '${MANIFEST_FILE}'. ` +
          `Verify the path is correct and that the discovery step picked it up.`
      );
    }

    if (!entry.serverRunFlags || entry.serverRunFlags.length === 0) {
      throw new Error(
        `scoutConfig '${normalized}' has no serverRunFlags in the manifest. ` +
          `Ensure the config has tags that resolve to at least one (arch, domain) mode.`
      );
    }

    for (const mode of entry.serverRunFlags) {
      totalJobs += req.count;
      if (totalJobs > MAX_JOBS) {
        throw new Error(
          `Expanding scoutConfigs across (arch, domain) modes produced more than ${MAX_JOBS} ` +
            `Buildkite jobs (counted ${totalJobs} so far). Lower the per-config 'count' or ` +
            `request fewer configs in this run.`
        );
      }

      steps.push({
        command: '.buildkite/scripts/steps/test/scout/flaky_configs.sh',
        env: {
          SCOUT_CONFIG: normalized,
          SCOUT_SERVER_RUN_FLAGS: mode,
          SCOUT_REPORTER_ENABLED: 'true',
          ...options.extraEnv,
        },
        key: `${TestSuiteType.SCOUT}-${suiteIndex++}`,
        label: `${normalized} (${mode})`,
        parallelism: req.count,
        concurrency: options.concurrency,
        concurrency_group: options.concurrencyGroup,
        concurrency_method: 'eager',
        agents: expandAgentQueue(entry.usesParallelWorkers ? 'n2-8-spot' : 'n2-4-spot'),
        depends_on: ['build', 'scout_playwright_configs'],
        timeout_in_minutes: 60,
        retry: {
          automatic: [{ exit_status: '-1', limit: 3 }],
        },
      });
    }
  }

  return steps;
};

const main = () => {
  const requests = parseRequests();
  if (requests.length === 0) {
    console.log('No Scout flaky requests to plan; nothing to upload.');
    return;
  }

  const concurrencyEnv = process.env.SCOUT_FLAKY_CONCURRENCY;
  const concurrency = concurrencyEnv ? parseInt(concurrencyEnv, 10) : 25;
  if (Number.isNaN(concurrency)) {
    fail(`Invalid SCOUT_FLAKY_CONCURRENCY: ${concurrencyEnv}`);
  }

  const concurrencyGroup = process.env.SCOUT_FLAKY_CONCURRENCY_GROUP || undefined;
  const extraEnv = collectEnvFromLabels(process.env.GITHUB_PR_LABELS);

  const manifest = downloadManifest();
  const configIndex = indexConfigs(manifest);

  const steps = buildSteps(requests, configIndex, {
    concurrency,
    concurrencyGroup,
    extraEnv,
  });

  if (steps.length === 0) {
    console.log('Plan produced no steps; skipping upload.');
    return;
  }

  console.log(`--- Uploading ${steps.length} Scout flaky steps`);
  for (const step of steps) {
    console.log(`  - ${step.label} [parallelism=${step.parallelism}]`);
  }

  new BuildkiteClient().uploadSteps(steps);
};

main();
