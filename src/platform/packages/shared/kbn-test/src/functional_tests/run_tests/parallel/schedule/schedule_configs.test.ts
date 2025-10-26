/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'node:path';

import { scheduleConfigs } from './schedule_configs';
import type { SlotResources, ServerCapabilities } from '../get_slot_resources';
import { REPO_ROOT } from '@kbn/repo-info';
import { ScoutTestRunConfigCategory } from '@kbn/scout-info';

import { readConfig } from '../read_config';
import { getSlotResources } from '../get_slot_resources';
import { checkForEnabledTestsInFtrConfig } from '../../../lib';
import type { Config } from '../../../../functional_test_runner/lib/config';

jest.mock('../read_config', () => ({
  readConfig: jest.fn(),
}));

jest.mock('../get_slot_resources', () => ({
  getSlotResources: jest.fn(),
}));

jest.mock('../../../lib', () => ({
  checkForEnabledTestsInFtrConfig: jest.fn(),
}));

const readConfigMock = readConfig as jest.MockedFunction<typeof readConfig>;
const getSlotResourcesMock = getSlotResources as jest.MockedFunction<typeof getSlotResources>;
const checkForEnabledTestsMock = checkForEnabledTestsInFtrConfig as jest.MockedFunction<
  typeof checkForEnabledTestsInFtrConfig
>;

describe('scheduleConfigs', () => {
  interface MockCapabilities extends ServerCapabilities {
    __resourceKey: string;
  }

  const resourceMap = new Map<string, SlotResources>();

  const createCapabilities = (absolutePath: string): MockCapabilities => ({
    __resourceKey: absolutePath,
    testConfigCategory: ScoutTestRunConfigCategory.API_TEST,
    servers: { elasticsearch: {} },
    esTestCluster: { from: 'snapshot' },
    kbnTestServer: { startRemoteKibana: false, useDedicatedTaskRunner: false },
  });

  const setResources = (configPath: string, resources: SlotResources) => {
    const absolutePath = Path.resolve(REPO_ROOT, configPath);
    resourceMap.set(absolutePath, resources);
  };

  beforeEach(() => {
    resourceMap.clear();

    // Mock config loading to stash the absolute path so the resource mock can find it later.
    readConfigMock.mockImplementation(async (_log, absolutePath) => {
      const capabilities = createCapabilities(absolutePath);

      return {
        getAll: () => capabilities,
      } as unknown as Config;
    });

    // Make every config eligible for scheduling.
    checkForEnabledTestsMock.mockResolvedValue(true);

    // Mock slot resource lookup using the map populated by individual tests.
    getSlotResourcesMock.mockImplementation((capabilities) => {
      const resourceKey = (capabilities as MockCapabilities).__resourceKey;
      const resources = resourceMap.get(resourceKey);
      if (!resources) {
        throw new Error(`No slot resources registered for ${resourceKey}`);
      }
      return resources;
    });
  });

  it('packs compatible configs into separate lanes when capacity allows', async () => {
    setResources('configs/a.ts', {
      warming: { cpu: 1, memory: 2048, exclusive: false },
      running: { cpu: 1, memory: 2048, exclusive: false },
    });
    setResources('configs/b.ts', {
      warming: { cpu: 1, memory: 2048, exclusive: false },
      running: { cpu: 1, memory: 2048, exclusive: false },
    });

    const result = await scheduleConfigs({
      maxDurationMins: 60,
      configs: [
        { path: 'configs/a.ts', testDurationMins: 20 },
        { path: 'configs/b.ts', testDurationMins: 10 },
      ],
      machines: [{ name: 'c5.2xlarge', cpus: 4, memoryMb: 4096 }],
    });

    expect(result.groups).toHaveLength(1);
    const group = result.groups[0];

    expect(group.configs.map((cfg) => cfg.path)).toEqual(['configs/a.ts', 'configs/b.ts']);
    expect(group.configs.map((cfg) => cfg.startTimeMins)).toEqual([0, 0]);
    expect(group.expectedDurationMins).toBeCloseTo(20, 5);
  });

  it('prefers reusing existing machines when capacity allows', async () => {
    setResources('configs/a.ts', {
      warming: { cpu: 1, memory: 2048, exclusive: false },
      running: { cpu: 1, memory: 2048, exclusive: false },
    });
    setResources('configs/b.ts', {
      warming: { cpu: 1, memory: 2048, exclusive: false },
      running: { cpu: 1, memory: 2048, exclusive: false },
    });
    setResources('configs/c.ts', {
      warming: { cpu: 1, memory: 2048, exclusive: false },
      running: { cpu: 1, memory: 2048, exclusive: false },
    });

    const result = await scheduleConfigs({
      maxDurationMins: 60,
      configs: [
        { path: 'configs/a.ts', testDurationMins: 30 },
        { path: 'configs/b.ts', testDurationMins: 25 },
        { path: 'configs/c.ts', testDurationMins: 20 },
      ],
      machines: [
        { name: 'm-primary', cpus: 8, memoryMb: 8192 },
        { name: 'm-secondary', cpus: 8, memoryMb: 8192 },
      ],
    });

    expect(result.groups).toHaveLength(1);
    const [group] = result.groups;
    expect(group.machine.name).toBe('m-primary');
    expect(group.configs).toHaveLength(3);
    expect(new Set(group.configs.map((cfg) => cfg.startTimeMins))).toEqual(new Set([0]));
  });

  it('packs identical configs on the same machine when template matches', async () => {
    setResources('configs/a.ts', {
      warming: { cpu: 1, memory: 2048, exclusive: false },
      running: { cpu: 2, memory: 4096, exclusive: false },
    });
    setResources('configs/b.ts', {
      warming: { cpu: 1, memory: 2048, exclusive: false },
      running: { cpu: 2, memory: 4096, exclusive: false },
    });

    const result = await scheduleConfigs({
      maxDurationMins: 60,
      configs: [
        { path: 'configs/a.ts', testDurationMins: 30 },
        { path: 'configs/b.ts', testDurationMins: 30 },
      ],
      machines: [{ name: 'n2-standard-8', cpus: 8, memoryMb: 32768 }],
    });

    expect(result.groups).toHaveLength(1);
    const group = result.groups[0];
    expect(group.configs).toHaveLength(2);
    expect(group.configs.map((cfg) => cfg.startTimeMins)).toEqual([0, 0]);
  });

  it('provisions a new machine when resource width exceeds capacity', async () => {
    setResources('configs/a.ts', {
      warming: { cpu: 2, memory: 2048, exclusive: false },
      running: { cpu: 2, memory: 2048, exclusive: false },
    });
    setResources('configs/b.ts', {
      warming: { cpu: 2, memory: 8192, exclusive: false },
      running: { cpu: 2, memory: 8192, exclusive: false },
    });

    const result = await scheduleConfigs({
      maxDurationMins: 60,
      configs: [
        { path: 'configs/a.ts', testDurationMins: 30 },
        { path: 'configs/b.ts', testDurationMins: 15 },
      ],
      machines: [
        { name: 'c5.2xlarge', cpus: 4, memoryMb: 4096 },
        { name: 'c5.9xlarge', cpus: 18, memoryMb: 16384 },
      ],
    });

    expect(result.groups).toHaveLength(2);

    const groupForA = result.groups.find((group) => group.configs[0]?.path === 'configs/a.ts');
    const groupForB = result.groups.find((group) => group.configs[0]?.path === 'configs/b.ts');

    expect(groupForA).toBeDefined();
    expect(groupForB).toBeDefined();
    expect(groupForB?.machine.memoryMb).toBe(16384);
  });

  it('distributes zero-resource configs across machines and lanes', async () => {
    setResources('configs/nonzero_a.ts', {
      warming: { cpu: 1, memory: 4096, exclusive: false },
      running: { cpu: 1, memory: 4096, exclusive: false },
    });
    setResources('configs/nonzero_b.ts', {
      warming: { cpu: 1, memory: 2048, exclusive: false },
      running: { cpu: 1, memory: 2048, exclusive: false },
    });
    setResources('configs/nonzero_c.ts', {
      warming: { cpu: 2, memory: 8192, exclusive: false },
      running: { cpu: 2, memory: 8192, exclusive: false },
    });

    const zeroResources: SlotResources = {
      warming: { cpu: 0, memory: 0, exclusive: false },
      running: { cpu: 0, memory: 0, exclusive: false },
    };

    ['noop_1', 'noop_2', 'noop_3', 'noop_4'].forEach((name) => {
      setResources(`configs/${name}.ts`, zeroResources);
    });

    const result = await scheduleConfigs({
      maxDurationMins: 60,
      configs: [
        { path: 'configs/nonzero_a.ts', testDurationMins: 20 },
        { path: 'configs/nonzero_b.ts', testDurationMins: 10 },
        { path: 'configs/nonzero_c.ts', testDurationMins: 15 },
        { path: 'configs/noop_1.ts', testDurationMins: 0 },
        { path: 'configs/noop_2.ts', testDurationMins: 0 },
        { path: 'configs/noop_3.ts', testDurationMins: 0 },
        { path: 'configs/noop_4.ts', testDurationMins: 0 },
      ],
      machines: [
        { name: 'm-primary', cpus: 8, memoryMb: 8192 },
        { name: 'm-secondary', cpus: 8, memoryMb: 8192 },
      ],
    });

    expect(result.groups).toHaveLength(2);

    const groupWithHeavy = result.groups.find((group) =>
      group.configs.some((cfg) => cfg.path === 'configs/nonzero_c.ts')
    );
    const groupWithLight = result.groups.find((group) => group !== groupWithHeavy);

    expect(groupWithHeavy).toBeDefined();
    expect(groupWithLight).toBeDefined();

    const zeroOnHeavy = groupWithHeavy!.configs.filter((cfg) => cfg.testDurationMins === 0);
    const zeroOnLight = groupWithLight!.configs.filter((cfg) => cfg.testDurationMins === 0);

    expect(zeroOnHeavy).toHaveLength(2);
    expect(zeroOnLight).toHaveLength(2);

    const lightLaneStartTimes = new Set(zeroOnLight.map((cfg) => cfg.startTimeMins));
    expect(lightLaneStartTimes.size).toBeGreaterThan(1);
  });
});
