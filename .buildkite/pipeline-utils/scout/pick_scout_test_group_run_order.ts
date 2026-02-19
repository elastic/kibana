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

export interface ModuleDiscoveryInfo {
  name: string;
  group: string;
  type: 'plugin' | 'package';
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
      : ['build_scout_tests'];

  const scoutCiRunGroups = modulesWithTests.map((module) => {
    // Check if any config in this module uses parallel workers
    const usesParallelWorkers = module.configs.some((config) => config.usesParallelWorkers);

    return {
      label: `Scout: [ ${module.group} / ${module.name} ] ${module.type}`,
      key: module.name,
      agents: expandAgentQueue(usesParallelWorkers ? 'n2-8-spot' : 'n2-4-spot'),
      group: module.group,
    };
  });

  // upload the step definitions to Buildkite
  bk.uploadSteps(
    [
      {
        group: 'Scout Configs',
        key: 'scout-configs',
        depends_on: SCOUT_CONFIGS_DEPS,
        steps: scoutCiRunGroups.map(
          ({ label, key, group, agents }): BuildkiteStep => ({
            label,
            command: getRequiredEnv('SCOUT_CONFIGS_SCRIPT'),
            timeout_in_minutes: 60,
            agents,
            env: {
              SCOUT_CONFIG_GROUP_KEY: key,
              SCOUT_CONFIG_GROUP_TYPE: group,
              ...envFromlabels,
              ...scoutExtraEnv,
            },
            retry: {
              automatic: [
                { exit_status: '10', limit: 1 },
                { exit_status: '*', limit: 3 },
              ],
            },
          })
        ),
      },
    ].flat()
  );
}
