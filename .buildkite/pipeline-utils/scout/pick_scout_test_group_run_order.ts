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
import { BuildkiteClient, type BuildkiteStep } from '../buildkite';
import { collectEnvFromLabels } from '../pr_labels';
import { getRequiredEnv } from '#pipeline-utils';
import { splitModulesByServerRunFlags } from './module_split';

export interface ModuleDiscoveryInfo {
  name: string;
  group: string;
  type: 'plugin' | 'package';
  isAffected?: boolean;
  configs: {
    path: string;
    hasTests: boolean;
    tags: string[];
    serverRunFlags: string[];
    usesParallelWorkers: boolean;
  }[];
}

// Collect environment variables to pass through to test execution steps
const scoutExtraEnv: Record<string, string> = {};
if (process.env.SERVERLESS_TESTS_ONLY) {
  scoutExtraEnv.SERVERLESS_TESTS_ONLY = process.env.SERVERLESS_TESTS_ONLY;
}

if (process.env.UIAM_DOCKER_IMAGE) {
  scoutExtraEnv.UIAM_DOCKER_IMAGE = process.env.UIAM_DOCKER_IMAGE;
}

if (process.env.UIAM_COSMOSDB_DOCKER_IMAGE) {
  scoutExtraEnv.UIAM_COSMOSDB_DOCKER_IMAGE = process.env.UIAM_COSMOSDB_DOCKER_IMAGE;
}

export async function pickScoutTestGroupRunOrder(scoutConfigsPath: string) {
  const bk = new BuildkiteClient();
  const envFromlabels: Record<string, string> = collectEnvFromLabels();

  if (!Fs.existsSync(scoutConfigsPath)) {
    throw new Error(`Scout configs file not found at ${scoutConfigsPath}`);
  }

  const modulesWithTests = JSON.parse(
    Fs.readFileSync(scoutConfigsPath, 'utf-8')
  ) as ModuleDiscoveryInfo[];

  if (modulesWithTests.length === 0) {
    // no scout configs found, nothing to need to upload steps
    return;
  }

  const SCOUT_CONFIGS_DEPS =
    process.env.SCOUT_CONFIGS_DEPS !== undefined
      ? process.env.SCOUT_CONFIGS_DEPS.split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : ['build_scout_tests', 'build'];

  // Heavy modules (streams_app, dashboard, ...) are fanned out here into one virtual
  // module per (arch, domain) so each mode runs in its own BK step. This used to happen
  // in `kbn-scout`'s discovery CLI before saving the manifest, but that conflated
  // "describe the codebase" with "schedule the build" and produced duplicate config-path
  // entries that broke the flaky-runner planner. Now the manifest stays canonical and the
  // split is applied here at scheduling time.
  const scheduledModules = splitModulesByServerRunFlags(modulesWithTests);

  const scoutCiRunGroups = scheduledModules.map((module) => {
    const usesParallelWorkers = module.configs.some((config) => config.usesParallelWorkers);
    const affectedPrefix = module.isAffected ? 'affected ' : '';

    // A module is "split" when it contributes exactly one config with exactly one
    // `serverRunFlag` (i.e. a single arch/domain mode). For these, we set SCOUT_CONFIG +
    // SCOUT_SERVER_RUN_FLAGS directly so the BK step skips the manifest jq lookup in
    // configs.sh and runs only the targeted mode. Non-split modules keep the existing
    // SCOUT_CONFIG_GROUP_KEY contract and let configs.sh iterate every config/mode.
    const isSplitModule =
      module.configs.length === 1 && module.configs[0].serverRunFlags.length === 1;
    const splitConfig = isSplitModule ? module.configs[0] : undefined;

    return {
      label: `${affectedPrefix}Scout: [ ${module.group} / ${module.name} ] ${module.type}`,
      key: module.name,
      agents: expandAgentQueue(usesParallelWorkers ? 'n2-8-spot' : 'n2-4-spot'),
      group: module.group,
      splitConfig,
    };
  });

  const steps = [
    {
      group: 'Scout Configs',
      key: 'scout-configs',
      depends_on: SCOUT_CONFIGS_DEPS,
      steps: scoutCiRunGroups.map(
        ({ label, key, group, agents, splitConfig }): BuildkiteStep => ({
          label,
          command: getRequiredEnv('SCOUT_CONFIGS_SCRIPT'),
          timeout_in_minutes: 60,
          key,
          agents,
          env: splitConfig
            ? {
                SCOUT_CONFIG: splitConfig.path,
                SCOUT_SERVER_RUN_FLAGS: splitConfig.serverRunFlags[0],
                SCOUT_CONFIG_GROUP_TYPE: group,
                ...envFromlabels,
                ...scoutExtraEnv,
              }
            : {
                SCOUT_CONFIG_GROUP_KEY: key,
                SCOUT_CONFIG_GROUP_TYPE: group,
                ...envFromlabels,
                ...scoutExtraEnv,
              },
          retry: {
            automatic: [
              { exit_status: '-1', limit: 3 },
              { exit_status: '*', limit: 1 },
            ],
          },
        })
      ),
    },
  ].flat();

  // Register each Scout child step for cancel-on-gate-failure before uploading
  // so a concurrent gate failure can cancel or short-circuit them immediately.
  // We register child step keys (not the group key) because `buildkite-agent step cancel`
  // does not work on group keys.
  bk.setMetadata(
    'cancel_on_gate_failure_batch:scout',
    JSON.stringify(scoutCiRunGroups.map(({ key }) => key))
  );

  // upload the step definitions to Buildkite
  bk.uploadSteps(steps);
}
