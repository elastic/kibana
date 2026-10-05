/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { ScoutTestTrack } from './test_tracks.ts';

let mockKibanaDir: string;

const mockUploadSteps = jest.fn();
const mockUploadArtifacts = jest.fn();
const mockSetMetadata = jest.fn();

jest.mock('../buildkite/index.ts', () => ({
  BuildkiteClient: jest.fn().mockImplementation(() => ({
    uploadSteps: mockUploadSteps,
    uploadArtifacts: mockUploadArtifacts,
    setMetadata: mockSetMetadata,
  })),
}));

jest.mock('../agent_images.ts', () => ({
  expandAgentQueue: (queueName: string) => ({ queue: queueName }),
}));

jest.mock('../pr_labels.ts', () => ({
  collectEnvFromLabels: () => ({}),
}));

jest.mock('../utils.ts', () => ({
  getKibanaDir: () => mockKibanaDir,
}));

const mockDefinitionsAll = jest.fn();
const mockDefinitionsLoadFromPath = jest.fn();

jest.mock('./test_tracks.ts', () => ({
  scoutTestTrack: {
    definitions: {
      all: () => mockDefinitionsAll(),
      loadFromPath: (p: string) => mockDefinitionsLoadFromPath(p),
    },
  },
}));

jest.mock('./paths.ts', () => ({
  get SCOUT_OUTPUT_ROOT() {
    return path.join(mockKibanaDir, '.scout');
  },
  get SCOUT_TEST_LANE_LOADS_PATH() {
    return path.join(mockKibanaDir, '.scout', 'test_lane_loads.json');
  },
}));

import { scoutTestDistributionStrategies } from './test_distribution_strategies.ts';

const createMockTrackDefinition = (tracks: ScoutTestTrack[]) => ({ tracks });

const createMockTrack = (
  location: string,
  arch: string,
  domain: string,
  configSet: string,
  lanes: ScoutTestTrack['lanes']
): ScoutTestTrack => ({
  stats: {
    lane: {
      count: lanes.length,
      saturationPercent: 80,
      longestEstimate: 100,
      shortestEstimate: 50,
    },
    combinedRuntime: { target: 200, expected: 150, unused: 50, overflow: 0 },
  },
  lanes,
  metadata: {
    testTarget: { location, arch, domain },
    server: { configSet },
  },
});

// Default runtimeEstimate (700_000 ms ≈ 11.7 min) sits above the compaction threshold
// for the default target runtime (20 min → threshold = 10 min), so lanes created without
// an explicit runtimeEstimate behave as regular (non-compact) lanes in the base tests.
const createMockLane = (
  number: number,
  agentQueue: string,
  loads: string[],
  runtimeEstimate = 700_000
): ScoutTestTrack['lanes'][0] => ({
  number,
  estimatedSetupDuration: 0,
  runtimeTarget: 1_200_000,
  runtimeEstimate,
  availableCapacity: 1_200_000 - runtimeEstimate,
  status: 'open',
  isCongested: false,
  loads,
  metadata: { buildkite: { agentQueue } },
});

describe('scoutTestDistributionStrategies', () => {
  const originalEnv = process.env;
  let tmpDir: string;
  let writeFileSyncSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scout-dist-test-'));
    mockKibanaDir = tmpDir;
    fs.mkdirSync(path.join(tmpDir, '.scout'), { recursive: true });
    writeFileSyncSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    process.env = { ...originalEnv };
    delete process.env.SCOUT_TEST_LANES_GROUP_DEPS;
    delete process.env.SERVERLESS_TESTS_ONLY;
    delete process.env.UIAM_DOCKER_IMAGE;
    delete process.env.UIAM_COSMOSDB_DOCKER_IMAGE;
  });

  afterEach(() => {
    writeFileSyncSpy.mockRestore();
    process.env = originalEnv;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('lanes strategy', () => {
    it('throws when no test track definitions are found', async () => {
      mockDefinitionsAll.mockReturnValue([]);

      await expect(scoutTestDistributionStrategies.lanes()).rejects.toThrow(
        'No Scout test tracks definition files found'
      );
    });

    it('creates one Buildkite step per lane across all tracks', async () => {
      const track1 = createMockTrack('local', 'stateful', 'classic', 'default', [
        createMockLane(1, 'n2-4-spot', ['config-a.ts']),
        createMockLane(2, 'n2-4-spot', ['config-b.ts']),
      ]);
      const track2 = createMockTrack('local', 'serverless', 'search', 'default', [
        createMockLane(1, 'n2-8-spot', ['config-c.ts']),
      ]);

      mockDefinitionsAll.mockReturnValue(['/mock/tracks.json']);
      mockDefinitionsLoadFromPath.mockReturnValue(createMockTrackDefinition([track1, track2]));

      await scoutTestDistributionStrategies.lanes();

      const uploadedGroup = mockUploadSteps.mock.calls[0][0][0];
      expect(uploadedGroup.steps).toHaveLength(3);
    });

    it('step keys are numbered sequentially across tracks', async () => {
      const track = createMockTrack('local', 'stateful', 'classic', 'default', [
        createMockLane(1, 'n2-4-spot', ['config-a.ts']),
        createMockLane(2, 'n2-4-spot', ['config-b.ts']),
      ]);

      mockDefinitionsAll.mockReturnValue(['/mock/tracks.json']);
      mockDefinitionsLoadFromPath.mockReturnValue(createMockTrackDefinition([track]));

      await scoutTestDistributionStrategies.lanes();

      const uploadedGroup = mockUploadSteps.mock.calls[0][0][0];
      expect(uploadedGroup.steps[0].key).toBe('scout_test_lane_1');
      expect(uploadedGroup.steps[1].key).toBe('scout_test_lane_2');
    });

    it('step env includes correct target and server config vars', async () => {
      const track = createMockTrack('local', 'serverless', 'search', 'custom_config', [
        createMockLane(1, 'n2-8-spot', ['config-a.ts']),
      ]);

      mockDefinitionsAll.mockReturnValue(['/mock/tracks.json']);
      mockDefinitionsLoadFromPath.mockReturnValue(createMockTrackDefinition([track]));

      await scoutTestDistributionStrategies.lanes();

      const step = mockUploadSteps.mock.calls[0][0][0].steps[0];
      expect(step.env.SCOUT_TEST_TARGET_LOCATION).toBe('local');
      expect(step.env.SCOUT_TEST_TARGET_ARCH).toBe('serverless');
      expect(step.env.SCOUT_TEST_TARGET_DOMAIN).toBe('search');
      expect(step.env.SCOUT_TEST_SERVER_CONFIG_SET).toBe('custom_config');
    });

    it('uses default dependency when SCOUT_TEST_LANES_GROUP_DEPS is not set', async () => {
      delete process.env.SCOUT_TEST_LANES_GROUP_DEPS;

      const track = createMockTrack('local', 'stateful', 'classic', 'default', [
        createMockLane(1, 'n2-4-spot', ['config-a.ts']),
      ]);

      mockDefinitionsAll.mockReturnValue(['/mock/tracks.json']);
      mockDefinitionsLoadFromPath.mockReturnValue(createMockTrackDefinition([track]));

      await scoutTestDistributionStrategies.lanes();

      const uploadedGroup = mockUploadSteps.mock.calls[0][0][0];
      expect(uploadedGroup.depends_on).toEqual(['build_scout_tests']);
    });

    it('uses no dependencies when SCOUT_TEST_LANES_GROUP_DEPS is an empty string', async () => {
      process.env.SCOUT_TEST_LANES_GROUP_DEPS = '';

      const track = createMockTrack('local', 'stateful', 'classic', 'default', [
        createMockLane(1, 'n2-4-spot', ['config-a.ts']),
      ]);

      mockDefinitionsAll.mockReturnValue(['/mock/tracks.json']);
      mockDefinitionsLoadFromPath.mockReturnValue(createMockTrackDefinition([track]));

      await scoutTestDistributionStrategies.lanes();

      const uploadedGroup = mockUploadSteps.mock.calls[0][0][0];
      expect(uploadedGroup.depends_on).toEqual([]);
    });

    it('uses custom dependencies from SCOUT_TEST_LANES_GROUP_DEPS env var', async () => {
      process.env.SCOUT_TEST_LANES_GROUP_DEPS = 'step_a,step_b';

      const track = createMockTrack('local', 'stateful', 'classic', 'default', [
        createMockLane(1, 'n2-4-spot', ['config-a.ts']),
      ]);

      mockDefinitionsAll.mockReturnValue(['/mock/tracks.json']);
      mockDefinitionsLoadFromPath.mockReturnValue(createMockTrackDefinition([track]));

      await scoutTestDistributionStrategies.lanes();

      const uploadedGroup = mockUploadSteps.mock.calls[0][0][0];
      expect(uploadedGroup.depends_on).toEqual(['step_a', 'step_b']);
    });

    it('registers each lane step for cancel-on-gate-failure before uploading', async () => {
      const track = createMockTrack('local', 'stateful', 'classic', 'default', [
        createMockLane(1, 'n2-4-spot', ['config-a.ts']),
        createMockLane(2, 'n2-4-spot', ['config-b.ts']),
      ]);

      mockDefinitionsAll.mockReturnValue(['/mock/tracks.json']);
      mockDefinitionsLoadFromPath.mockReturnValue(createMockTrackDefinition([track]));

      await scoutTestDistributionStrategies.lanes();

      expect(mockSetMetadata).toHaveBeenCalledWith(
        'cancel_on_gate_failure_batch:scout_lanes',
        JSON.stringify(['scout_test_lane_1', 'scout_test_lane_2'])
      );
      expect(mockSetMetadata.mock.invocationCallOrder[0]).toBeLessThan(
        mockUploadSteps.mock.invocationCallOrder[0]
      );
    });

    describe('compact lane compaction', () => {
      // Compact threshold = targetRuntimeMs / 2. Set target to 4 min (240_000 ms),
      // so threshold = 2 min (120_000 ms).
      const TARGET_MIN = 4;
      // SHORT_RUNTIME < threshold (120_000 ms) → qualifies as compact
      const SHORT_RUNTIME = 60_000; // 1 min
      // LONG_RUNTIME >= threshold → stays as a regular lane
      const LONG_RUNTIME = 180_000; // 3 min

      beforeEach(() => {
        process.env.SCOUT_TEST_LANE_TARGET_RUNTIME_MINUTES = String(TARGET_MIN);
      });

      afterEach(() => {
        delete process.env.SCOUT_TEST_LANE_TARGET_RUNTIME_MINUTES;
      });

      it('packs compact lanes into one combined step and writes loadGroups to the loads file', async () => {
        const track1 = createMockTrack('local', 'stateful', 'classic', 'config_a', [
          createMockLane(1, 'n2-4-spot', ['a.ts'], SHORT_RUNTIME),
        ]);
        const track2 = createMockTrack('local', 'stateful', 'classic', 'config_b', [
          createMockLane(1, 'n2-4-spot', ['b.ts'], SHORT_RUNTIME),
        ]);

        mockDefinitionsAll.mockReturnValue(['/mock/tracks.json']);
        mockDefinitionsLoadFromPath.mockReturnValue(createMockTrackDefinition([track1, track2]));

        await scoutTestDistributionStrategies.lanes();

        const { steps } = mockUploadSteps.mock.calls[0][0][0];
        expect(steps).toHaveLength(1);
        // Combined lane must NOT set SCOUT_TEST_SERVER_CONFIG_SET (runner reads it from loadGroups)
        expect(steps[0].env.SCOUT_TEST_SERVER_CONFIG_SET).toBeUndefined();

        const written = JSON.parse(writeFileSyncSpy.mock.calls[0][1] as string);
        expect(written['scout_test_lane_1']).not.toHaveProperty('loadIDs');
        expect(written['scout_test_lane_1'].loadGroups).toEqual([
          { configSet: 'config_a', loadIDs: ['a.ts'] },
          { configSet: 'config_b', loadIDs: ['b.ts'] },
        ]);
      });

      it('keeps lanes at or above threshold as individual steps with loadIDs', async () => {
        const regular = createMockTrack('local', 'stateful', 'classic', 'default', [
          createMockLane(1, 'n2-4-spot', ['big.ts'], LONG_RUNTIME),
        ]);
        const compact = createMockTrack('local', 'stateful', 'classic', 'custom', [
          createMockLane(1, 'n2-4-spot', ['small.ts'], SHORT_RUNTIME),
        ]);

        mockDefinitionsAll.mockReturnValue(['/mock/tracks.json']);
        mockDefinitionsLoadFromPath.mockReturnValue(
          createMockTrackDefinition([regular, compact])
        );

        await scoutTestDistributionStrategies.lanes();

        const { steps } = mockUploadSteps.mock.calls[0][0][0];
        // Regular lane step + one combined step for the single compact lane
        expect(steps).toHaveLength(2);
        expect(steps[0].env.SCOUT_TEST_SERVER_CONFIG_SET).toBe('default');
        expect(steps[1].env.SCOUT_TEST_SERVER_CONFIG_SET).toBeUndefined();

        const written = JSON.parse(writeFileSyncSpy.mock.calls[0][1] as string);
        expect(written['scout_test_lane_1']).toHaveProperty('loadIDs');
        expect(written['scout_test_lane_2']).toHaveProperty('loadGroups');
      });

      it('does not combine compact lanes from different testTargets', async () => {
        const stateful = createMockTrack('local', 'stateful', 'classic', 'config_a', [
          createMockLane(1, 'n2-4-spot', ['a.ts'], SHORT_RUNTIME),
        ]);
        const serverless = createMockTrack('local', 'serverless', 'search', 'config_b', [
          createMockLane(1, 'n2-8-spot', ['b.ts'], SHORT_RUNTIME),
        ]);

        mockDefinitionsAll.mockReturnValue(['/mock/tracks.json']);
        mockDefinitionsLoadFromPath.mockReturnValue(
          createMockTrackDefinition([stateful, serverless])
        );

        await scoutTestDistributionStrategies.lanes();

        // Each testTarget group produces its own combined step
        const { steps } = mockUploadSteps.mock.calls[0][0][0];
        expect(steps).toHaveLength(2);
      });

      it('opens a new combined step when the target runtime would be exceeded', async () => {
        // target = 4 min (240_000 ms), threshold = 2 min (120_000 ms)
        // each lane: 100_000 ms (< threshold → compact)
        // 2 × 100_000 = 200_000 fits; 3 × 100_000 = 300_000 > 240_000 → 2 combined steps
        const runtime = 100_000;

        const tracks = ['a', 'b', 'c'].map((n) =>
          createMockTrack('local', 'stateful', 'classic', `config_${n}`, [
            createMockLane(1, 'n2-4-spot', [`${n}.ts`], runtime),
          ])
        );

        mockDefinitionsAll.mockReturnValue(['/mock/tracks.json']);
        mockDefinitionsLoadFromPath.mockReturnValue(createMockTrackDefinition(tracks));

        await scoutTestDistributionStrategies.lanes();

        const { steps } = mockUploadSteps.mock.calls[0][0][0];
        expect(steps).toHaveLength(2);
      });
    });
  });
});
