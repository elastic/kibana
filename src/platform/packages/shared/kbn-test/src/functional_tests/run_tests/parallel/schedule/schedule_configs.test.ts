/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'node:path';

import type { ScheduleConfigInput } from './types';
import { scheduleConfigs } from './schedule_configs';

jest.mock('../read_config', () => ({
  readConfig: jest.fn(),
}));

jest.mock('../get_slot_resources', () => ({
  getSlotResources: jest.fn(),
}));

jest.mock('@kbn/tooling-log', () => ({
  ToolingLog: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    debug: jest.fn(),
  })),
}));

const { readConfig } = jest.requireMock('../read_config') as {
  readConfig: jest.MockedFunction<any>;
};

const { getSlotResources } = jest.requireMock('../get_slot_resources') as {
  getSlotResources: jest.MockedFunction<any>;
};

const CONFIG_A_PATH = path.resolve(__dirname, '__fixtures__/config_stub.js');

const CONFIG_B_PATH = path.resolve(__dirname, '__fixtures__/config_stub_b.js');

const CONFIG_C_PATH = path.resolve(__dirname, '__fixtures__/config_stub_c.js');

const createResources = (cpu: number, memory: number) => ({
  warming: { cpu, memory, exclusive: false },
  idle: { cpu: cpu / 2, memory, exclusive: false },
  running: { cpu, memory, exclusive: false },
});

const createConfigMock = (resourcesByPath: Map<string, any>) => {
  readConfig.mockImplementation((_log: unknown, configPath: string) => {
    const resources = resourcesByPath.get(configPath);
    if (!resources) {
      throw new Error(`Unexpected config path: ${configPath}`);
    }

    return {
      getAll: () => ({ __resources: resources }),
    };
  });

  getSlotResources.mockImplementation((capabilities: { __resources: any }) => {
    return capabilities.__resources;
  });
};

describe('scheduleConfigs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('assigns configs to the most suitable machines and avoids extending wall time', async () => {
    const configs: ScheduleConfigInput[] = [
      { path: CONFIG_A_PATH, testDurationMins: 60 },
      { path: CONFIG_B_PATH, testDurationMins: 30 },
      { path: CONFIG_C_PATH, testDurationMins: 10 },
    ];

    createConfigMock(
      new Map([
        [CONFIG_A_PATH, createResources(6, 16 * 1024)],
        [CONFIG_B_PATH, createResources(3, 8 * 1024)],
        [CONFIG_C_PATH, createResources(2, 6 * 1024)],
      ])
    );

    const result = await scheduleConfigs({
      configs,
      maxDurationMins: 45,
      machines: [
        { name: 'machine-1', cpus: 8, memoryMb: 32 * 1024 },
        { name: 'machine-2', cpus: 4, memoryMb: 16 * 1024 },
      ],
    });

    expect(result.groups).toHaveLength(2);

    const [primary, secondary] = result.groups;

    expect(primary.machine.name).toBe('machine-1');
    expect(primary.configs.map((config) => config.path)).toEqual([CONFIG_A_PATH]);
    expect(primary.configs[0].tooLong).toBe(true);
    expect(primary.expectedDurationMins).toBeCloseTo(61.5, 4);

    expect(secondary.machine.name).toBe('machine-1');
    expect(secondary.configs.map((config) => config.path)).toEqual([CONFIG_B_PATH, CONFIG_C_PATH]);
    expect(secondary.configs.every((config) => config.tooLong === false)).toBe(true);
    expect(secondary.expectedDurationMins).toBeCloseTo(31.5, 4);
  });

  it('continues scheduling configs on a machine even after exceeding the duration target', async () => {
    const configs: ScheduleConfigInput[] = [
      { path: CONFIG_A_PATH, testDurationMins: 70 },
      { path: CONFIG_B_PATH, testDurationMins: 20 },
    ];

    createConfigMock(
      new Map([
        [CONFIG_A_PATH, createResources(4, 12 * 1024)],
        [CONFIG_B_PATH, createResources(3, 12 * 1024)],
      ])
    );

    const result = await scheduleConfigs({
      configs,
      maxDurationMins: 60,
      machines: [{ name: 'machine-1', cpus: 8, memoryMb: 32 * 1024 }],
    });

    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].machine.name).toBe('machine-1');
    expect(result.groups[0].configs.map((config) => config.path)).toEqual([
      CONFIG_A_PATH,
      CONFIG_B_PATH,
    ]);
    expect(result.groups[0].configs[0].tooLong).toBe(true);
    expect(result.groups[0].configs[1].tooLong).toBe(false);
    expect(result.groups[0].expectedDurationMins).toBeCloseTo(71.5, 4);
  });

  it('creates an additional worker when the wall duration would exceed the target', async () => {
    const configs: ScheduleConfigInput[] = [
      { path: CONFIG_A_PATH, testDurationMins: 55 },
      { path: CONFIG_B_PATH, testDurationMins: 20 },
    ];

    createConfigMock(
      new Map([
        [CONFIG_A_PATH, createResources(4, 12 * 1024)],
        [CONFIG_B_PATH, createResources(4, 12 * 1024)],
      ])
    );

    const result = await scheduleConfigs({
      configs,
      maxDurationMins: 60,
      machines: [{ name: 'machine-1', cpus: 4, memoryMb: 32 * 1024 }],
    });

    expect(result.groups).toHaveLength(2);
    expect(result.groups[0].configs.map((config) => config.path)).toEqual([CONFIG_A_PATH]);
    expect(result.groups[1].configs.map((config) => config.path)).toEqual([CONFIG_B_PATH]);
    expect(result.groups[0].expectedDurationMins).toBeCloseTo(56.5, 4);
    expect(result.groups[1].expectedDurationMins).toBeCloseTo(21.5, 4);
  });

  it('uses largest machine type as fallback when no machine can satisfy config requirements', async () => {
    createConfigMock(new Map([[CONFIG_A_PATH, createResources(10, 64 * 1024)]]));

    const result = await scheduleConfigs({
      configs: [{ path: CONFIG_A_PATH, testDurationMins: 10 }],
      maxDurationMins: 45,
      machines: [
        { name: 'machine-large', cpus: 8, memoryMb: 32 * 1024 },
        { name: 'machine-small', cpus: 4, memoryMb: 16 * 1024 },
      ],
    });

    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].machine.name).toBe('machine-large');
    expect(result.groups[0].configs[0].path).toBe(CONFIG_A_PATH);
    expect(result.groups[0].expectedDurationMins).toBeGreaterThan(0);
  });

  it('uses largest machine type as fallback for warming phase that exceeds all machines', async () => {
    const warmingHeavyResources = {
      warming: { cpu: 2, memory: 40 * 1024, exclusive: false },
      idle: { cpu: 1, memory: 8 * 1024, exclusive: false },
      running: { cpu: 1, memory: 8 * 1024, exclusive: false },
    };

    createConfigMock(new Map([[CONFIG_A_PATH, warmingHeavyResources]]));

    const result = await scheduleConfigs({
      configs: [{ path: CONFIG_A_PATH, testDurationMins: 20 }],
      maxDurationMins: 45,
      machines: [
        { name: 'machine-large', cpus: 4, memoryMb: 32 * 1024 },
        { name: 'machine-small', cpus: 2, memoryMb: 16 * 1024 },
      ],
    });

    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].machine.name).toBe('machine-large');
    expect(result.groups[0].configs[0].path).toBe(CONFIG_A_PATH);
    expect(result.groups[0].expectedDurationMins).toBeGreaterThan(0);
  });
});
