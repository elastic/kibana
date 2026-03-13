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
import type { ScoutTestTrack } from './test_tracks';

let mockKibanaDir: string;

const mockUploadSteps = jest.fn();
const mockUploadArtifacts = jest.fn();

jest.mock('../buildkite', () => ({
  BuildkiteClient: jest.fn().mockImplementation(() => ({
    uploadSteps: mockUploadSteps,
    uploadArtifacts: mockUploadArtifacts,
  })),
}));

jest.mock('../agent_images', () => ({
  expandAgentQueue: (queueName: string) => ({ queue: queueName }),
}));

jest.mock('../pr_labels', () => ({
  collectEnvFromLabels: () => ({}),
}));

jest.mock('../utils', () => ({
  getKibanaDir: () => mockKibanaDir,
}));

const mockDefinitionsAll = jest.fn();
const mockDefinitionsLoadFromPath = jest.fn();

jest.mock('./test_tracks', () => ({
  scoutTestTrack: {
    definitions: {
      all: () => mockDefinitionsAll(),
      loadFromPath: (p: string) => mockDefinitionsLoadFromPath(p),
    },
  },
}));

jest.mock('./paths', () => ({
  get SCOUT_OUTPUT_ROOT() {
    return path.join(mockKibanaDir, '.scout');
  },
  get SCOUT_TEST_LANE_LOADS_PATH() {
    return path.join(mockKibanaDir, '.scout', 'test_lane_loads.json');
  },
}));

import { scoutTestDistributionStrategies } from './test_distribution_strategies';

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

const createMockLane = (
  number: number,
  agentQueue: string,
  loads: string[]
): ScoutTestTrack['lanes'][0] => ({
  number,
  estimatedSetupDuration: 0,
  runtimeTarget: 200,
  runtimeEstimate: 100,
  availableCapacity: 100,
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

    it('step command points to run_test_lane.sh', async () => {
      const track = createMockTrack('local', 'stateful', 'classic', 'default', [
        createMockLane(1, 'n2-4-spot', ['config-a.ts']),
      ]);

      mockDefinitionsAll.mockReturnValue(['/mock/tracks.json']);
      mockDefinitionsLoadFromPath.mockReturnValue(createMockTrackDefinition([track]));

      await scoutTestDistributionStrategies.lanes();

      const step = mockUploadSteps.mock.calls[0][0][0].steps[0];
      expect(step.command).toBe('.buildkite/scripts/steps/test/scout/run_test_lane.sh');
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

    it('uses no dependencies when SCOUT_TEST_LANES_GROUP_DEPS is empty string', async () => {
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
  });
});
