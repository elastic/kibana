/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'node:path';

import { ToolingLog } from '@kbn/tooling-log';

import { REPO_ROOT } from '@kbn/repo-info';
import {
  getSlotResources,
  type ServerCapabilities,
  type SlotResources,
} from '../get_slot_resources';
import { readConfig } from '../read_config';
import type {
  ScheduleConfigOptions,
  ScheduleConfigOutput,
  ScheduleConfigTestGroupResults,
} from './types';
import { checkForEnabledTestsInFtrConfig } from '../../../lib';
import { EsVersion } from '../../../../functional_test_runner';

const EPSILON = 0.000001;

const ZERO_SLOT_RESOURCES: SlotResources = {
  warming: { cpu: 0, memory: 0, exclusive: false },
  running: { cpu: 0, memory: 0, exclusive: false },
};

const resolveConfigPath = (value: string) => Path.resolve(REPO_ROOT, value);

function isZeroConfigStats(stats: ConfigStats): boolean {
  return (
    Math.abs(stats.duration) <= EPSILON &&
    Math.abs(stats.memoryWidth) <= EPSILON &&
    Math.abs(stats.warmCpu) <= EPSILON &&
    Math.abs(stats.runCpu) <= EPSILON
  );
}

interface ConfigStats {
  config: ScheduleConfigOutput;
  duration: number;
  memoryWidth: number;
  warmCpu: number;
  runCpu: number;
}

interface LaneState {
  memoryWidth: number;
  warmCpuWidth: number;
  runCpuWidth: number;
  totalDuration: number;
  configCount: number;
  zeroConfigCount: number;
}

interface MachineTemplate {
  name: string;
  cpus: number;
  memoryMb: number;
}

interface MachineState {
  id: number;
  template: MachineTemplate;
  lanes: LaneState[];
  configs: ScheduleConfigOutput[];
  finishTime: number;
  memoryUsage: number;
  warmCpuUsage: number;
  runCpuUsage: number;
  configCount: number;
  zeroConfigCount: number;
}

interface PlacementCandidate {
  machine: MachineState | null;
  machineTemplate: MachineTemplate;
  laneIndex: number;
  startTime: number;
  laneDurationAfter: number;
  laneMemoryAfter: number;
  laneWarmAfter: number;
  laneRunAfter: number;
  memoryUsageAfter: number;
  warmCpuUsageAfter: number;
  runCpuUsageAfter: number;
  machineFinish: number;
  overallFinish: number;
  isNewLane: boolean;
  isNewMachine: boolean;
  isZeroConfig: boolean;
  laneConfigCountAfter: number;
  laneConfigCountBefore: number;
  machineConfigCountAfter: number;
  machineConfigCountBefore: number;
  laneZeroCountAfter: number;
  laneZeroCountBefore: number;
  machineZeroCountAfter: number;
  machineZeroCountBefore: number;
}

export async function scheduleConfigs({
  configs,
  maxDurationMins,
  machines,
}: ScheduleConfigOptions): Promise<ScheduleConfigTestGroupResults> {
  if (machines.length === 0) {
    throw new Error('Cannot schedule configs without available machines');
  }

  const toolingLog = createToolingLog();

  const configStatsList = await Promise.all(
    configs.map(async (configInput) =>
      loadConfigStats({ configInput, maxDurationMins, toolingLog })
    )
  );

  const machineTemplates = machines
    .map((machine) => ({ ...machine }))
    .sort((a, b) => {
      if (b.cpus !== a.cpus) {
        return b.cpus - a.cpus;
      }

      if (b.memoryMb !== a.memoryMb) {
        return b.memoryMb - a.memoryMb;
      }

      return a.name.localeCompare(b.name);
    });

  const sortedStats = configStatsList.slice().sort((a, b) => {
    if (Math.abs(b.memoryWidth - a.memoryWidth) > EPSILON) {
      return b.memoryWidth - a.memoryWidth;
    }

    if (Math.abs(b.duration - a.duration) > EPSILON) {
      return b.duration - a.duration;
    }

    return a.config.path.localeCompare(b.config.path);
  });

  const longestDuration = sortedStats.reduce((max, stats) => {
    return Math.max(max, stats.duration);
  }, 0);

  const targetDuration = Math.max(maxDurationMins, longestDuration);

  const machineInstances: MachineState[] = [];
  let nextMachineId = 0;

  for (const stats of sortedStats) {
    const bestCandidate = findBestPlacement({
      stats,
      machineInstances,
      machineTemplates,
      targetDuration,
    });

    if (!bestCandidate) {
      throw new Error(`Unable to schedule config ${stats.config.path}`);
    }

    const assignment = applyPlacement({
      candidate: bestCandidate,
      machineInstances,
      nextMachineId,
      stats,
    });

    if (assignment.isNewMachine) {
      nextMachineId = assignment.nextId;
    }
  }

  const groups = machineInstances
    .filter((instance) => instance.configs.length > 0)
    .sort((a, b) => a.id - b.id)
    .map((instance) => {
      const configsOrderedByStart = [...instance.configs].sort((a, b) => {
        const startA = a.startTimeMins ?? Number.POSITIVE_INFINITY;
        const startB = b.startTimeMins ?? Number.POSITIVE_INFINITY;

        if (Math.abs(startA - startB) > EPSILON) {
          return startA - startB;
        }

        return a.path.localeCompare(b.path);
      });

      return {
        configs: configsOrderedByStart,
        machine: { ...instance.template },
        expectedDurationMins: Number(instance.finishTime.toFixed(2)),
      };
    });

  return { groups };
}

function createToolingLog(): ToolingLog {
  return new ToolingLog({
    level: 'error',
    writeTo: process.stdout,
  });
}

async function loadConfigStats({
  configInput,
  maxDurationMins,
  toolingLog,
}: {
  configInput: ScheduleConfigOptions['configs'][number];
  maxDurationMins: number;
  toolingLog: ToolingLog;
}): Promise<ConfigStats> {
  const absoluteConfigPath = resolveConfigPath(configInput.path);
  const configObject = await readConfig(toolingLog, absoluteConfigPath, {});
  const testConfigCategory = configObject.get('testConfigCategory');

  const hasTests = await checkForEnabledTestsInFtrConfig({
    config: configObject,
    esVersion: EsVersion.getDefault(),
    log: toolingLog,
  });

  if (!hasTests) {
    const emptyOutput: ScheduleConfigOutput = {
      path: configInput.path,
      testDurationMins: 0,
      resources: ZERO_SLOT_RESOURCES,
      tooLong: false,
      testConfigCategory,
    };

    return {
      config: emptyOutput,
      duration: 0,
      memoryWidth: 0,
      warmCpu: 0,
      runCpu: 0,
    };
  }

  const capabilities = configObject.getAll() as unknown as ServerCapabilities;
  const slotResources = getSlotResources(capabilities);

  const scheduleOutput: ScheduleConfigOutput = {
    path: configInput.path,
    testDurationMins: configInput.testDurationMins,
    resources: slotResources,
    tooLong: configInput.testDurationMins > maxDurationMins,
    testConfigCategory,
  };

  const memoryWidth = Math.max(slotResources.warming.memory, slotResources.running.memory);

  return {
    config: scheduleOutput,
    duration: Math.max(configInput.testDurationMins, 0),
    memoryWidth,
    warmCpu: slotResources.warming.cpu,
    runCpu: slotResources.running.cpu,
  };
}

function findBestPlacement({
  stats,
  machineInstances,
  machineTemplates,
  targetDuration,
}: {
  stats: ConfigStats;
  machineInstances: MachineState[];
  machineTemplates: MachineTemplate[];
  targetDuration: number;
}): PlacementCandidate | undefined {
  let bestCandidate: PlacementCandidate | undefined;
  const currentOverallMax = computeOverallMax(machineInstances);
  const zeroConfig = isZeroConfigStats(stats);

  for (const machine of machineInstances) {
    const otherMaxFinish = computeOtherMax(machineInstances, machine.id);

    machine.lanes.forEach((_, laneIndex) => {
      const candidate = createExistingLaneCandidate({
        machine,
        laneIndex,
        stats,
        otherMaxFinish,
      });

      if (candidate && isBetterCandidate({ candidate, incumbent: bestCandidate, targetDuration })) {
        bestCandidate = candidate;
      }
    });

    const newLaneCandidate = createNewLaneCandidate({
      machine,
      stats,
      otherMaxFinish,
    });

    if (
      newLaneCandidate &&
      isBetterCandidate({ candidate: newLaneCandidate, incumbent: bestCandidate, targetDuration })
    ) {
      bestCandidate = newLaneCandidate;
    }
  }

  if (!zeroConfig || machineInstances.length === 0) {
    for (const template of machineTemplates) {
      const candidate = createNewMachineCandidate({
        template,
        stats,
        currentOverallMax,
      });

      if (candidate && isBetterCandidate({ candidate, incumbent: bestCandidate, targetDuration })) {
        bestCandidate = candidate;
      }
    }
  }

  return bestCandidate;
}

function createExistingLaneCandidate({
  machine,
  laneIndex,
  stats,
  otherMaxFinish,
}: {
  machine: MachineState;
  laneIndex: number;
  stats: ConfigStats;
  otherMaxFinish: number;
}): PlacementCandidate | undefined {
  const lane = machine.lanes[laneIndex];
  const isZero = isZeroConfigStats(stats);

  const nextLaneMemory = Math.max(lane.memoryWidth, stats.memoryWidth);
  const nextLaneWarm = Math.max(lane.warmCpuWidth, stats.warmCpu);
  const nextLaneRun = Math.max(lane.runCpuWidth, stats.runCpu);

  const nextMemoryUsage = machine.memoryUsage - lane.memoryWidth + nextLaneMemory;
  if (nextMemoryUsage - machine.template.memoryMb > EPSILON) {
    return undefined;
  }

  const nextWarmUsage = machine.warmCpuUsage - lane.warmCpuWidth + nextLaneWarm;
  if (nextWarmUsage - machine.template.cpus > EPSILON) {
    return undefined;
  }

  const nextRunUsage = machine.runCpuUsage - lane.runCpuWidth + nextLaneRun;
  if (nextRunUsage - machine.template.cpus > EPSILON) {
    return undefined;
  }

  const startTime = lane.totalDuration;
  const nextLaneDuration = startTime + stats.duration;
  const nextMachineFinish = Math.max(machine.finishTime, nextLaneDuration);
  const overallFinish = Math.max(nextMachineFinish, otherMaxFinish);
  const nextLaneConfigCount = lane.configCount + 1;
  const nextMachineConfigCount = machine.configCount + 1;
  const nextLaneZeroCount = isZero ? lane.zeroConfigCount + 1 : lane.zeroConfigCount;
  const nextMachineZeroCount = isZero ? machine.zeroConfigCount + 1 : machine.zeroConfigCount;

  return {
    machine,
    machineTemplate: machine.template,
    laneIndex,
    startTime,
    laneDurationAfter: nextLaneDuration,
    laneMemoryAfter: nextLaneMemory,
    laneWarmAfter: nextLaneWarm,
    laneRunAfter: nextLaneRun,
    memoryUsageAfter: nextMemoryUsage,
    warmCpuUsageAfter: nextWarmUsage,
    runCpuUsageAfter: nextRunUsage,
    machineFinish: nextMachineFinish,
    overallFinish,
    isNewLane: false,
    isNewMachine: false,
    isZeroConfig: isZero,
    laneConfigCountAfter: nextLaneConfigCount,
    laneConfigCountBefore: lane.configCount,
    machineConfigCountAfter: nextMachineConfigCount,
    machineConfigCountBefore: machine.configCount,
    laneZeroCountAfter: nextLaneZeroCount,
    laneZeroCountBefore: lane.zeroConfigCount,
    machineZeroCountAfter: nextMachineZeroCount,
    machineZeroCountBefore: machine.zeroConfigCount,
  };
}

function createNewLaneCandidate({
  machine,
  stats,
  otherMaxFinish,
}: {
  machine: MachineState;
  stats: ConfigStats;
  otherMaxFinish: number;
}): PlacementCandidate | undefined {
  const isZero = isZeroConfigStats(stats);
  const nextMemoryUsage = machine.memoryUsage + stats.memoryWidth;
  if (nextMemoryUsage - machine.template.memoryMb > EPSILON) {
    return undefined;
  }

  const nextWarmUsage = machine.warmCpuUsage + stats.warmCpu;
  if (nextWarmUsage - machine.template.cpus > EPSILON) {
    return undefined;
  }

  const nextRunUsage = machine.runCpuUsage + stats.runCpu;
  if (nextRunUsage - machine.template.cpus > EPSILON) {
    return undefined;
  }

  const nextLaneDuration = stats.duration;
  const nextMachineFinish = Math.max(machine.finishTime, nextLaneDuration);
  const overallFinish = Math.max(nextMachineFinish, otherMaxFinish);
  const nextLaneConfigCount = 1;
  const nextMachineConfigCount = machine.configCount + 1;
  const nextLaneZeroCount = isZero ? 1 : 0;
  const nextMachineZeroCount = isZero ? machine.zeroConfigCount + 1 : machine.zeroConfigCount;

  return {
    machine,
    machineTemplate: machine.template,
    laneIndex: machine.lanes.length,
    startTime: 0,
    laneDurationAfter: nextLaneDuration,
    laneMemoryAfter: stats.memoryWidth,
    laneWarmAfter: stats.warmCpu,
    laneRunAfter: stats.runCpu,
    memoryUsageAfter: nextMemoryUsage,
    warmCpuUsageAfter: nextWarmUsage,
    runCpuUsageAfter: nextRunUsage,
    machineFinish: nextMachineFinish,
    overallFinish,
    isNewLane: true,
    isNewMachine: false,
    isZeroConfig: isZero,
    laneConfigCountAfter: nextLaneConfigCount,
    laneConfigCountBefore: 0,
    machineConfigCountAfter: nextMachineConfigCount,
    machineConfigCountBefore: machine.configCount,
    laneZeroCountAfter: nextLaneZeroCount,
    laneZeroCountBefore: 0,
    machineZeroCountAfter: nextMachineZeroCount,
    machineZeroCountBefore: machine.zeroConfigCount,
  };
}

function createNewMachineCandidate({
  template,
  stats,
  currentOverallMax,
}: {
  template: MachineTemplate;
  stats: ConfigStats;
  currentOverallMax: number;
}): PlacementCandidate | undefined {
  const isZero = isZeroConfigStats(stats);
  if (stats.memoryWidth - template.memoryMb > EPSILON) {
    return undefined;
  }

  if (stats.warmCpu - template.cpus > EPSILON) {
    return undefined;
  }

  if (stats.runCpu - template.cpus > EPSILON) {
    return undefined;
  }

  const machineFinish = stats.duration;
  const overallFinish = Math.max(machineFinish, currentOverallMax);
  const nextLaneConfigCount = 1;
  const nextMachineConfigCount = 1;
  const nextLaneZeroCount = isZero ? 1 : 0;
  const nextMachineZeroCount = isZero ? 1 : 0;

  return {
    machine: null,
    machineTemplate: template,
    laneIndex: 0,
    startTime: 0,
    laneDurationAfter: stats.duration,
    laneMemoryAfter: stats.memoryWidth,
    laneWarmAfter: stats.warmCpu,
    laneRunAfter: stats.runCpu,
    memoryUsageAfter: stats.memoryWidth,
    warmCpuUsageAfter: stats.warmCpu,
    runCpuUsageAfter: stats.runCpu,
    machineFinish,
    overallFinish,
    isNewLane: true,
    isNewMachine: true,
    isZeroConfig: isZero,
    laneConfigCountAfter: nextLaneConfigCount,
    laneConfigCountBefore: 0,
    machineConfigCountAfter: nextMachineConfigCount,
    machineConfigCountBefore: 0,
    laneZeroCountAfter: nextLaneZeroCount,
    laneZeroCountBefore: 0,
    machineZeroCountAfter: nextMachineZeroCount,
    machineZeroCountBefore: 0,
  };
}

function isBetterCandidate({
  candidate,
  incumbent,
  targetDuration,
}: {
  candidate: PlacementCandidate;
  incumbent?: PlacementCandidate;
  targetDuration: number;
}): boolean {
  if (!incumbent) {
    return true;
  }

  if (candidate.isZeroConfig) {
    if (!incumbent.isZeroConfig) {
      return true;
    }

    if (candidate.machineZeroCountAfter !== incumbent.machineZeroCountAfter) {
      return candidate.machineZeroCountAfter < incumbent.machineZeroCountAfter;
    }

    if (candidate.machineZeroCountBefore !== incumbent.machineZeroCountBefore) {
      return candidate.machineZeroCountBefore < incumbent.machineZeroCountBefore;
    }

    if (candidate.laneZeroCountAfter !== incumbent.laneZeroCountAfter) {
      return candidate.laneZeroCountAfter < incumbent.laneZeroCountAfter;
    }

    if (candidate.laneZeroCountBefore !== incumbent.laneZeroCountBefore) {
      return candidate.laneZeroCountBefore < incumbent.laneZeroCountBefore;
    }

    if (Math.abs(candidate.startTime - incumbent.startTime) > EPSILON) {
      return candidate.startTime > incumbent.startTime;
    }

    if (candidate.machineConfigCountAfter !== incumbent.machineConfigCountAfter) {
      return candidate.machineConfigCountAfter < incumbent.machineConfigCountAfter;
    }

    if (candidate.machineConfigCountBefore !== incumbent.machineConfigCountBefore) {
      return candidate.machineConfigCountBefore < incumbent.machineConfigCountBefore;
    }

    if (candidate.laneConfigCountAfter !== incumbent.laneConfigCountAfter) {
      return candidate.laneConfigCountAfter < incumbent.laneConfigCountAfter;
    }

    if (candidate.laneConfigCountBefore !== incumbent.laneConfigCountBefore) {
      return candidate.laneConfigCountBefore < incumbent.laneConfigCountBefore;
    }

    if (Math.abs(candidate.laneDurationAfter - incumbent.laneDurationAfter) > EPSILON) {
      return candidate.laneDurationAfter < incumbent.laneDurationAfter;
    }
  } else if (incumbent.isZeroConfig) {
    return false;
  }

  if (candidate.overallFinish < incumbent.overallFinish - EPSILON) {
    return true;
  }

  if (candidate.overallFinish > incumbent.overallFinish + EPSILON) {
    return false;
  }

  const candidateTarget = Math.max(targetDuration, candidate.overallFinish);
  const incumbentTarget = Math.max(targetDuration, incumbent.overallFinish);
  const candidateDeviation = Math.abs(candidate.machineFinish - candidateTarget);
  const incumbentDeviation = Math.abs(incumbent.machineFinish - incumbentTarget);

  if (candidateDeviation < incumbentDeviation - EPSILON) {
    return true;
  }

  if (
    candidate.isNewMachine !== incumbent.isNewMachine &&
    candidate.machineTemplate.name === incumbent.machineTemplate.name &&
    candidate.machineTemplate.cpus === incumbent.machineTemplate.cpus &&
    candidate.machineTemplate.memoryMb === incumbent.machineTemplate.memoryMb
  ) {
    return incumbent.isNewMachine;
  }

  if (candidateDeviation > incumbentDeviation + EPSILON) {
    return false;
  }
  if (candidate.memoryUsageAfter < incumbent.memoryUsageAfter - EPSILON) {
    return true;
  }

  if (candidate.memoryUsageAfter > incumbent.memoryUsageAfter + EPSILON) {
    return false;
  }

  return candidate.machineTemplate.name.localeCompare(incumbent.machineTemplate.name) < 0;
}

function applyPlacement({
  candidate,
  machineInstances,
  nextMachineId,
  stats,
}: {
  candidate: PlacementCandidate;
  machineInstances: MachineState[];
  nextMachineId: number;
  stats: ConfigStats;
}): { machine: MachineState; isNewMachine: boolean; nextId: number } {
  let machine = candidate.machine;
  let updatedNextId = nextMachineId;
  let isNewMachine = false;

  if (!machine) {
    const newMachine: MachineState = {
      id: updatedNextId,
      template: { ...candidate.machineTemplate },
      lanes: [],
      configs: [],
      finishTime: 0,
      memoryUsage: 0,
      warmCpuUsage: 0,
      runCpuUsage: 0,
      configCount: 0,
      zeroConfigCount: 0,
    };
    machineInstances.push(newMachine);
    machine = newMachine;
    updatedNextId += 1;
    isNewMachine = true;
  }

  const resolvedMachine = machine;
  const assignedConfig = stats.config;
  assignedConfig.startTimeMins = candidate.startTime;
  assignedConfig.laneIndex = candidate.laneIndex;

  if (candidate.isNewLane) {
    const newLane: LaneState = {
      memoryWidth: candidate.laneMemoryAfter,
      warmCpuWidth: candidate.laneWarmAfter,
      runCpuWidth: candidate.laneRunAfter,
      totalDuration: candidate.laneDurationAfter,
      configCount: candidate.laneConfigCountAfter,
      zeroConfigCount: candidate.laneZeroCountAfter,
    };
    resolvedMachine.lanes.push(newLane);
  } else {
    const lane = resolvedMachine.lanes[candidate.laneIndex];
    lane.memoryWidth = candidate.laneMemoryAfter;
    lane.warmCpuWidth = candidate.laneWarmAfter;
    lane.runCpuWidth = candidate.laneRunAfter;
    lane.totalDuration = candidate.laneDurationAfter;
    lane.configCount = candidate.laneConfigCountAfter;
    lane.zeroConfigCount = candidate.laneZeroCountAfter;
  }

  resolvedMachine.memoryUsage = candidate.memoryUsageAfter;
  resolvedMachine.warmCpuUsage = candidate.warmCpuUsageAfter;
  resolvedMachine.runCpuUsage = candidate.runCpuUsageAfter;
  resolvedMachine.finishTime = candidate.machineFinish;
  resolvedMachine.configCount = candidate.machineConfigCountAfter;
  resolvedMachine.zeroConfigCount = candidate.machineZeroCountAfter;
  resolvedMachine.configs.push(assignedConfig);

  return { machine: resolvedMachine, isNewMachine, nextId: updatedNextId };
}

function computeOverallMax(machines: MachineState[]): number {
  return machines.reduce((max, machine) => Math.max(max, machine.finishTime), 0);
}

function computeOtherMax(machines: MachineState[], targetId: number): number {
  let max = 0;
  for (const machine of machines) {
    if (machine.id === targetId) {
      continue;
    }
    max = Math.max(max, machine.finishTime);
  }
  return max;
}
