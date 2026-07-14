/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import { expandAgentQueue } from '../agent_images';
import { BuildkiteClient, type BuildkiteCommandStep } from '../buildkite';
import { collectEnvFromLabels } from '../pr_labels';
import type { ModuleDiscoveryInfo } from './pick_scout_test_group_run_order';

// Hard ceiling on total Buildkite jobs in a single build; mirrors the value in
// .buildkite/pipelines/flaky_tests/pipeline.ts. Validated here AFTER fan-out across
// (arch, domain) modes so the user gets a precise count.
const MAX_JOBS = 500;
const FLAKY_SUITE_KEY_PREFIX = 'scout-suite';

export interface ScoutFlakyRequest {
  type: 'scoutConfig';
  scoutConfig: string;
  count: number;
}

export interface PickScoutFlakyRunOrderOptions {
  /** Concurrency limit applied to each generated step (mirrors `concurrency` in pipeline.ts). */
  concurrency: number;
  /** Concurrency group key (typically the trigger UUID); empty string disables grouping. */
  concurrencyGroup?: string;
  /** Step keys the generated steps must wait for (defaults to ['build']). */
  dependsOn?: string[];
  /**
   * Number of Buildkite jobs already reserved by other parts of the build (e.g. FTR/Cypress
   * suites and fixed-overhead steps like build_kibana / post_stats). Counted against the
   * MAX_JOBS budget so the planner doesn't expand Scout fan-out past the platform cap.
   * Defaults to 0 (Scout is the only contributor).
   */
  reservedJobs?: number;
}

// Normalize "./foo/bar.config.ts" -> "foo/bar.config.ts" so it matches manifest entries.
const normalizeConfigPath = (path: string): string => path.replace(/^\.\//, '');

const indexConfigsByPath = (
  manifest: ModuleDiscoveryInfo[]
): Map<string, ModuleDiscoveryInfo['configs'][number]> => {
  const index = new Map<string, ModuleDiscoveryInfo['configs'][number]>();
  for (const module of manifest) {
    for (const config of module.configs) {
      index.set(config.path, config);
    }
  }
  return index;
};

const buildSteps = (
  requests: ScoutFlakyRequest[],
  configIndex: Map<string, ModuleDiscoveryInfo['configs'][number]>,
  options: Required<Pick<PickScoutFlakyRunOrderOptions, 'concurrency'>> &
    Pick<PickScoutFlakyRunOrderOptions, 'concurrencyGroup' | 'dependsOn' | 'reservedJobs'> & {
      extraEnv: Record<string, string>;
    }
): BuildkiteCommandStep[] => {
  const steps: BuildkiteCommandStep[] = [];
  let suiteIndex = 0;
  let scoutJobs = 0;
  const reservedJobs = options.reservedJobs ?? 0;

  for (const req of requests) {
    if (!req || req.type !== 'scoutConfig') {
      throw new Error(`Unexpected request entry: ${JSON.stringify(req)}`);
    }
    if (typeof req.scoutConfig !== 'string' || !req.scoutConfig) {
      throw new Error(`Request is missing 'scoutConfig' string: ${JSON.stringify(req)}`);
    }
    if (typeof req.count !== 'number' || req.count <= 0) {
      throw new Error(`Request 'count' must be a positive number: ${JSON.stringify(req)}`);
    }

    const normalized = normalizeConfigPath(req.scoutConfig);
    const entry = configIndex.get(normalized);

    if (!entry) {
      throw new Error(
        `scoutConfig '${normalized}' not found in the Scout Playwright configs manifest. ` +
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
      scoutJobs += req.count;
      if (reservedJobs + scoutJobs > MAX_JOBS) {
        throw new Error(
          `Total Buildkite jobs would exceed the platform cap of ${MAX_JOBS} ` +
            `(${reservedJobs} reserved by FTR/Cypress + fixed steps, ${scoutJobs} from Scout ` +
            `fan-out across (arch, domain) modes). Lower per-config 'count' values or ` +
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
        key: `${FLAKY_SUITE_KEY_PREFIX}-${suiteIndex++}`,
        label: `${normalized} (${mode})`,
        parallelism: req.count,
        concurrency: options.concurrency,
        concurrency_group: options.concurrencyGroup,
        concurrency_method: 'eager',
        agents: expandAgentQueue(entry.usesParallelWorkers ? 'n2-8-spot' : 'n2-4-spot'),
        depends_on: options.dependsOn ?? ['build'],
        timeout_in_minutes: 60,
        retry: {
          automatic: [{ exit_status: '-1', limit: 3 }],
        },
      });
    }
  }

  return steps;
};

/**
 * Reads the Scout Playwright configs manifest from disk, expands each user-requested
 * `scoutConfig` into one Buildkite step per (arch, domain) mode, and uploads the
 * resulting steps via the Buildkite agent.
 *
 * The manifest must already exist on disk; the caller is responsible for placing it
 * there (e.g. by downloading the artifact uploaded by the discovery step).
 */
export async function pickScoutFlakyRunOrder(
  scoutConfigsPath: string,
  requests: ScoutFlakyRequest[],
  options: PickScoutFlakyRunOrderOptions
): Promise<void> {
  if (requests.length === 0) {
    console.log('No Scout flaky requests to plan; nothing to upload.');
    return;
  }

  if (!Fs.existsSync(scoutConfigsPath)) {
    throw new Error(`Scout configs file not found at ${scoutConfigsPath}`);
  }

  const manifest = JSON.parse(Fs.readFileSync(scoutConfigsPath, 'utf-8')) as ModuleDiscoveryInfo[];

  const configIndex = indexConfigsByPath(manifest);
  const extraEnv: Record<string, string> = collectEnvFromLabels();

  const steps = buildSteps(requests, configIndex, {
    concurrency: options.concurrency,
    concurrencyGroup: options.concurrencyGroup,
    dependsOn: options.dependsOn,
    reservedJobs: options.reservedJobs,
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
}
