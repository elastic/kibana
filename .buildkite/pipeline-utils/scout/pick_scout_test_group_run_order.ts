/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import path from 'path';
import { expandAgentQueue } from '../agent_images';
import { BuildkiteClient, type BuildkiteStep } from '../buildkite';
import { collectEnvFromLabels } from '../pr_labels';
import { getKibanaDir, getRequiredEnv } from '#pipeline-utils';

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

// Buildkite step-level env does not propagate to dynamically uploaded child steps, so
// we explicitly forward an allow-list of env vars from the generator step's environment
// (set on the parent "Scout Test Run Builder" step in the consuming pipeline YAMLs)
// into each generated Scout Configs step's env. Allow-list (vs. spreading process.env)
// avoids leaking secrets and agent-internal vars into child steps.
const PASSTHROUGH_ENV_KEYS = [
  'SERVERLESS_TESTS_ONLY',
  'UIAM_DOCKER_IMAGE',
  'UIAM_COSMOSDB_DOCKER_IMAGE',
] as const;

const scoutExtraEnv: Record<string, string> = Object.fromEntries(
  PASSTHROUGH_ENV_KEYS.flatMap((key) => {
    const value = process.env[key];
    return value ? [[key, value]] : [];
  })
);

// Buildkite artifact name for the post-split ("scheduled") manifest produced by this
// scheduler. Distinct from the canonical `scout_playwright_configs.json` that discovery
// uploads so the two coexist without overwriting. `configs.sh` downloads this file when
// resolving `SCOUT_CONFIG_GROUP_KEY` for child steps.
const SCHEDULED_MANIFEST_FILENAME = 'scout_playwright_configs_scheduled.json';

// Heavy-suite modules whose test runs are too slow to share a single Buildkite step
// across every (arch, domain) mode. Substring match (e.g. `streams_app_api` is also
// covered) keeps the rule permissive without per-module bookkeeping.
const HEAVY_MODULE_NAME_FRAGMENTS = ['streams_app', 'dashboard'] as const;

const isHeavyModule = (moduleName: string): boolean =>
  HEAVY_MODULE_NAME_FRAGMENTS.some((fragment) => moduleName.includes(fragment));

const buildModeSuffix = (flag: string): string => {
  // "--arch <arch> --domain <domain>" -> "<arch>-<domain>"
  const archDomainMatch = flag.match(/--arch\s+(\S+)\s+--domain\s+(\S+)/);
  if (archDomainMatch) {
    return `${archDomainMatch[1]}-${archDomainMatch[2]}`;
  }
  return flag.replace(/^--/g, '').replace(/\s*--/g, '-').replace(/=/g, '-').replace(/\s+/g, '-');
};

/**
 * Splits heavy modules (per `HEAVY_MODULE_NAME_FRAGMENTS`) into one virtual module per
 * `(arch, domain)`, renamed `<original>-<arch>-<domain>` and narrowed to the configs
 * and single `serverRunFlag` that match. Non-matching modules pass through.
 * Pure: no I/O, no mutation.
 */
const splitHeavyModulesByServerRunFlags = (modules: ModuleDiscoveryInfo[]): ModuleDiscoveryInfo[] =>
  modules.flatMap((module) => {
    if (!isHeavyModule(module.name)) {
      return [module];
    }

    const allServerRunFlags = new Set<string>();
    for (const config of module.configs) {
      for (const flag of config.serverRunFlags) {
        allServerRunFlags.add(flag);
      }
    }

    if (allServerRunFlags.size === 0) {
      // Nothing to split on; emit the module unchanged so the caller can still produce
      // a step (or filter it out via its own checks).
      return [module];
    }

    return Array.from(allServerRunFlags).map((flag) => ({
      ...module,
      name: `${module.name}-${buildModeSuffix(flag)}`,
      configs: module.configs
        .filter((config) => config.serverRunFlags.includes(flag))
        .map((config) => ({
          ...config,
          serverRunFlags: [flag],
        })),
    }));
  });

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

  // Apply the heavy-suite split here, at scheduling time, so each (arch, domain) mode
  // for module gets its own Buildkite step. The scheduled (post-split)
  // manifest is uploaded as its own artifact (separate from the canonical one written
  // by discovery) so child steps can resolve their `SCOUT_CONFIG_GROUP_KEY` against
  // the same names emitted in the BK steps below.
  const scheduledModules = splitHeavyModulesByServerRunFlags(modulesWithTests);

  const scheduledManifestPath = path.join(getKibanaDir(), SCHEDULED_MANIFEST_FILENAME);
  Fs.writeFileSync(scheduledManifestPath, JSON.stringify(scheduledModules), 'utf-8');
  bk.uploadArtifacts(SCHEDULED_MANIFEST_FILENAME);

  const scoutCiRunGroups = scheduledModules.map((module) => {
    const usesParallelWorkers = module.configs.some((config) => config.usesParallelWorkers);
    const affectedPrefix = module.isAffected ? 'affected ' : '';

    return {
      label: `${affectedPrefix}Scout: [ ${module.group} / ${module.name} ] ${module.type}`,
      key: module.name,
      agents: expandAgentQueue(usesParallelWorkers ? 'n2-8-spot' : 'n2-4-spot'),
      group: module.group,
    };
  });

  const steps = [
    {
      group: 'Scout Configs',
      key: 'scout-configs',
      depends_on: SCOUT_CONFIGS_DEPS,
      steps: scoutCiRunGroups.map(
        ({ label, key, group, agents }): BuildkiteStep => ({
          label,
          command: getRequiredEnv('SCOUT_CONFIGS_SCRIPT'),
          timeout_in_minutes: 60,
          key,
          agents,
          env: {
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
