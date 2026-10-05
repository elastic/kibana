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
import { SCOUT_TEST_LANE_LOADS_PATH, SCOUT_TEST_TRACKS_ROOT } from './paths.ts';
import { scoutTestTrack, type ScoutTestTrack } from './test_tracks.ts';
import { pickScoutTestGroupRunOrder } from './pick_scout_test_group_run_order.ts';
import { BuildkiteClient, type BuildkiteCommandStep } from '../buildkite/index.ts';
import { getKibanaDir } from '../utils.ts';
import { expandAgentQueue } from '../agent_images.ts';
import { collectEnvFromLabels } from '../pr_labels.ts';

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

interface LaneInfo {
  label: string;
  loadGroups: Array<{ configSet: string; loadIDs: string[] }>;
}

interface LanePair {
  testTarget: ScoutTestTrack['metadata']['testTarget'];
  server: ScoutTestTrack['metadata']['server'];
  lane: ScoutTestTrack['lanes'][0];
}

async function distributeScoutTestsOnLanes() {
  const testTracksDefinitionPaths = scoutTestTrack.definitions.all();

  if (testTracksDefinitionPaths.length === 0) {
    throw new Error(`No Scout test tracks definition files found under ${SCOUT_TEST_TRACKS_ROOT}`);
  }

  const steps: BuildkiteCommandStep[] = [];
  const loadInfoByStepKey: Record<string, LaneInfo> = {};
  const testLaneLoadsFilePath = path.relative(getKibanaDir(), SCOUT_TEST_LANE_LOADS_PATH);

  const targetRuntimeMs =
    parseFloat(process.env.SCOUT_TEST_LANE_TARGET_RUNTIME_MINUTES || '20') * 60 * 1000;
  // target/2 guarantees at least two compact lanes always fit into one combined step.
  const compactThresholdMs = targetRuntimeMs / 2;

  const allLanePairs: LanePair[] = testTracksDefinitionPaths
    .map(scoutTestTrack.definitions.loadFromPath)
    .flatMap((definition: { tracks: ScoutTestTrack[] }) =>
      definition.tracks.flatMap((track) => track.lanes.map((lane) => ({ ...track.metadata, lane })))
    );

  const regularPairs = allLanePairs.filter(
    ({ lane }) => lane.runtimeEstimate >= compactThresholdMs
  );
  const compactPairs = allLanePairs.filter(({ lane }) => lane.runtimeEstimate < compactThresholdMs);

  const sharedEnv = {
    SCOUT_TEST_SERVER_START_TIMEOUT_SECONDS:
      process.env.SCOUT_TEST_SERVER_START_TIMEOUT_SECONDS || '300',
    ...envVarsIfSet(['SERVERLESS_TESTS_ONLY', 'UIAM_DOCKER_IMAGE', 'UIAM_COSMOSDB_DOCKER_IMAGE']),
    ...collectEnvFromLabels(),
  };

  const addLaneStep = (
    testTarget: LanePair['testTarget'],
    agentQueue: string,
    groups: LaneInfo['loadGroups']
  ) => {
    const effectiveLaneNumber = steps.length + 1;
    const stepKey = `scout_test_lane_${effectiveLaneNumber}`;
    // `lane.number` is only accurate relative to its originating track; use the global counter instead
    const configSetLabel =
      groups.length === 1
        ? groups[0].configSet
        : `combined [${groups.map((g) => g.configSet).join('+')}]`;
    const stepLabel = `Scout Lane #${effectiveLaneNumber} - ${testTarget.arch}-${testTarget.domain} / ${configSetLabel}`;

    steps.push({
      key: stepKey,
      label: stepLabel,
      command: '.buildkite/scripts/steps/test/scout/run_test_lane.sh',
      timeout_in_minutes: 60,
      agents: expandAgentQueue(agentQueue),
      env: {
        SCOUT_TEST_LANE_LOADS_PATH: testLaneLoadsFilePath,
        SCOUT_TEST_LANE_NUMBER: `${effectiveLaneNumber}`,
        SCOUT_TEST_TARGET_LOCATION: testTarget.location,
        SCOUT_TEST_TARGET_ARCH: testTarget.arch,
        SCOUT_TEST_TARGET_DOMAIN: testTarget.domain,
        ...sharedEnv,
      },
      retry: {
        automatic: [
          { exit_status: '-1', limit: 3 },
          { exit_status: '*', limit: 1 },
        ],
      },
    });

    loadInfoByStepKey[stepKey] = { label: stepLabel, loadGroups: groups };
  };

  regularPairs.forEach(({ testTarget, server, lane }) => {
    addLaneStep(testTarget, lane.metadata.buildkite.agentQueue, [
      { configSet: server.configSet, loadIDs: lane.loads },
    ]);
  });

  // Pack compact lanes: group by testTarget then greedy bin-pack into combined Buildkite steps.
  if (compactPairs.length > 0) {
    const compactByTarget = new Map<string, LanePair[]>();
    for (const pair of compactPairs) {
      const key = `${pair.testTarget.location}-${pair.testTarget.arch}-${pair.testTarget.domain}`;
      const existing = compactByTarget.get(key) ?? [];
      existing.push(pair);
      compactByTarget.set(key, existing);
    }

    interface CombinedSlot {
      testTarget: LanePair['testTarget'];
      agentQueue: string;
      usedMs: number;
      groups: LaneInfo['loadGroups'];
    }

    for (const [, pairs] of compactByTarget) {
      const combinedSlots: CombinedSlot[] = [];

      for (const { testTarget, server, lane } of pairs) {
        let slot = combinedSlots.find((s) => s.usedMs + lane.runtimeEstimate <= targetRuntimeMs);
        if (!slot) {
          slot = {
            testTarget,
            agentQueue: lane.metadata.buildkite.agentQueue,
            usedMs: 0,
            groups: [],
          };
          combinedSlots.push(slot);
        }
        slot.groups.push({ configSet: server.configSet, loadIDs: lane.loads });
        slot.usedMs += lane.runtimeEstimate;
      }

      for (const { testTarget, agentQueue, groups } of combinedSlots) {
        addLaneStep(testTarget, agentQueue, groups);
      }
    }
  }

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
  fs.writeFileSync(testLaneLoadsFilePath, JSON.stringify(loadInfoByStepKey));
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
