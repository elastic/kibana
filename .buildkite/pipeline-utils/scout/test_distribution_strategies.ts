/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'node:path';
import fs from 'node:fs';
import { SCOUT_TEST_LANE_LOADS_PATH, SCOUT_TEST_TRACKS_ROOT } from './paths';
import { scoutTestTrack, type ScoutTestTrack } from './test_tracks';
import { pickScoutTestGroupRunOrder } from './pick_scout_test_group_run_order';
import { BuildkiteClient, type BuildkiteCommandStep } from '../buildkite';
import { getKibanaDir } from '../utils';
import { expandAgentQueue } from '../agent_images';
import { collectEnvFromLabels } from '../pr_labels';

function envVarsIfSet(envVarNames: string[]): Record<string, string> {
  const collectedVars: Record<string, string> = {};

  envVarNames.forEach((envVarName) => {
    if (!(envVarName in process.env) || process.env[envVarName]?.trim().length === 0) {
      return;
    }

    collectedVars[envVarName] = process.env[envVarName]!;
  });

  return collectedVars;
}

async function distributeScoutTestsByModule() {
  try {
    const scoutConfigsPath = path.resolve(
      getKibanaDir(),
      '.scout',
      'test_configs',
      'scout_playwright_configs.json'
    );
    await pickScoutTestGroupRunOrder(scoutConfigsPath);
  } catch (ex) {
    console.error('Scout test grouping error: ', ex.message);
    if (ex.response) {
      console.error('HTTP Error Response Status', ex.response.status);
      console.error('HTTP Error Response Body', ex.response.data);
    }
    process.exit(1);
  }
}

async function distributeScoutTestsOnLanes() {
  const testTracksDefinitionPaths = scoutTestTrack.definitions.all();

  if (testTracksDefinitionPaths.length === 0) {
    throw new Error(`No Scout test tracks definition files found under ${SCOUT_TEST_TRACKS_ROOT}`);
  }

  const steps: BuildkiteCommandStep[] = [];
  const loadIDsByStepKey: Record<string, string[]> = {};
  const testLaneLoadsFilePath = path.relative(getKibanaDir(), SCOUT_TEST_LANE_LOADS_PATH);

  testTracksDefinitionPaths
    .map(scoutTestTrack.definitions.loadFromPath)
    .flatMap((definition: { tracks: ScoutTestTrack[] }) =>
      definition.tracks.flatMap((track) =>
        track.lanes.flatMap((lane) => ({ ...track.metadata, lane }))
      )
    )
    .forEach(({ testTarget, server, lane }) => {
      // Define the effective lane number. `lane.number` is only accurate in reference to the originating test track
      const effectiveLaneNumber = steps.length + 1;

      const stepKey = `scout_test_lane_${effectiveLaneNumber}`;

      const laneEnv = {
        SCOUT_TEST_LANE_LOADS_PATH: testLaneLoadsFilePath,
        SCOUT_TEST_LANE_NUMBER: `${effectiveLaneNumber}`,
        SCOUT_TEST_TARGET_LOCATION: testTarget.location,
        SCOUT_TEST_TARGET_ARCH: testTarget.arch,
        SCOUT_TEST_TARGET_DOMAIN: testTarget.domain,
        SCOUT_TEST_SERVER_CONFIG_SET: server.configSet,
        SCOUT_TEST_SERVER_START_TIMEOUT_SECONDS:
          process.env.SCOUT_TEST_SERVER_START_TIMEOUT_SECONDS || '300',
        ...envVarsIfSet([
          'SERVERLESS_TESTS_ONLY',
          'UIAM_DOCKER_IMAGE',
          'UIAM_COSMOSDB_DOCKER_IMAGE',
        ]),
        ...collectEnvFromLabels(),
      };

      // Agent that will do the actual work of running the test loads
      steps.push({
        key: `scout_test_lane_${effectiveLaneNumber}`,
        label: `Scout Lane #${effectiveLaneNumber} - ${testTarget.arch}-${testTarget.domain} / ${server.configSet}`,
        command: '.buildkite/scripts/steps/test/scout/run_test_lane.sh',
        timeout_in_minutes: 60,
        agents: expandAgentQueue(lane.metadata.buildkite.agentQueue),
        env: laneEnv,
        retry: {
          automatic: [
            { exit_status: '-1', limit: 3 },
            { exit_status: '*', limit: 1 },
          ],
        },
      });

      // Lane load IDs to be referenced by the agent
      loadIDsByStepKey[stepKey] = lane.loads;
    });

  if (steps.length === 0) {
    // Stop early. No test steps to upload. ✨
    return;
  }

  const bk = new BuildkiteClient();

  const lanesGroupStepDependencies: string[] = [];

  if (process.env.SCOUT_TEST_LANES_GROUP_DEPS !== undefined) {
    // Dependencies were specified in the environment
    // If the value is an empty string, it would effectively mean "no dependencies"
    process.env.SCOUT_TEST_LANES_GROUP_DEPS.split(',')
      .map((stepKey) => stepKey.trim())
      .filter((stepKey) => stepKey.length > 0)
      .forEach((stepKey) => lanesGroupStepDependencies.push(stepKey));
  } else {
    // Default dependencies
    lanesGroupStepDependencies.push('build_scout_tests');
  }

  bk.setMetadata(
    'cancel_on_gate_failure_batch:scout_lanes',
    JSON.stringify(steps.map(({ key }) => key))
  );

  // Write the test lane load IDs to disk in preparation of uploading as an artifact
  fs.writeFileSync(testLaneLoadsFilePath, JSON.stringify(loadIDsByStepKey));
  bk.uploadArtifacts(testLaneLoadsFilePath);

  // Send it 🚀
  bk.uploadSteps([
    {
      group: 'Scout Test Lanes',
      key: 'scout_test_lanes',
      depends_on: lanesGroupStepDependencies,
      steps,
    },
  ]);
}

export const scoutTestDistributionStrategies: Record<string, () => Promise<void>> = {
  lanes: distributeScoutTestsOnLanes,
  configs: distributeScoutTestsByModule,
};
