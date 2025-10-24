/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'node:path';

import { REPO_ROOT } from '@kbn/repo-info';
import { ToolingLog } from '@kbn/tooling-log';

import { getSlotResources, type ServerCapabilities } from '../get_slot_resources';
import { readConfig } from '../read_config';
import type {
  ScheduleConfigInput,
  ScheduleConfigOptions,
  ScheduleConfigOutput,
  ScheduleConfigTestGroup,
  ScheduleConfigTestGroupResults,
} from './types';

interface MachineState {
  machine: ScheduleConfigOptions['machines'][number];
  configs: ScheduleConfigOutput[];
  totalDuration: number;
  index: number;
}

export async function scheduleConfigs({
  configs,
  maxDurationMins,
  machines,
}: ScheduleConfigOptions): Promise<ScheduleConfigTestGroupResults> {
  if (machines.length === 0) {
    throw new Error('Cannot schedule configs without available machines');
  }

  const toolingLog = new ToolingLog({
    level: 'error',
    writeTo: process.stdout,
  });

  // Load config metadata and derive the required resources for each run.
  const configsWithResources = await Promise.all(
    configs.map(async (configInput): Promise<ScheduleConfigOutput> => {
      const absoluteConfigPath = resolveConfigPath(configInput);
      const configObject = await readConfig(toolingLog, absoluteConfigPath, {});
      const capabilities = configObject.getAll() as unknown as ServerCapabilities;
      const slotResources = getSlotResources(capabilities);

      return {
        path: configInput.path,
        testDurationMins: configInput.testDurationMins,
        resources: slotResources,
        tooLong: configInput.testDurationMins > maxDurationMins,
      };
    })
  );

  const machineStates = machines
    .map((machine, index) => ({
      machine,
      configs: [] as ScheduleConfigOutput[],
      totalDuration: 0,
      index,
    }))
    .sort(compareMachinePreference);

  // Sort by duration (largest first) for a greedy longest-processing-time assignment.
  const sortedConfigs = [...configsWithResources].sort(
    (left, right) => right.testDurationMins - left.testDurationMins
  );

  for (const configOutput of sortedConfigs) {
    const requiredCpu = getPeakCpu(configOutput.resources);
    const requiredMemory = getPeakMemory(configOutput.resources);

    const eligibleMachines = machineStates.filter(
      (state) => state.machine.cpus >= requiredCpu && state.machine.memoryMb >= requiredMemory
    );

    if (eligibleMachines.length === 0) {
      const formattedCpu = requiredCpu.toFixed(2);
      const formattedMemory = requiredMemory.toFixed(0);
      throw new Error(
        `Config ${configOutput.path} requires ${formattedCpu} CPUs / ${formattedMemory}MB but no machines provide sufficient resources`
      );
    }

    const machinesWithinLimit = eligibleMachines.filter(
      (state) => state.totalDuration + configOutput.testDurationMins <= maxDurationMins
    );

    const preferPacking = machinesWithinLimit.length > 0;
    const candidatePool = preferPacking ? machinesWithinLimit : eligibleMachines;

    const selectedMachine = candidatePool.reduce<MachineState | undefined>((best, candidate) => {
      if (!best) {
        return candidate;
      }

      if (preferPacking) {
        if (candidate.totalDuration > best.totalDuration) {
          return candidate;
        }

        if (candidate.totalDuration === best.totalDuration) {
          return pickLargerMachine(candidate, best);
        }

        return best;
      }

      if (candidate.totalDuration < best.totalDuration) {
        return candidate;
      }

      if (candidate.totalDuration === best.totalDuration) {
        return pickLargerMachine(candidate, best);
      }

      return best;
    }, undefined);

    if (!selectedMachine) {
      throw new Error(`Unable to select machine for config ${configOutput.path}`);
    }

    selectedMachine.configs.push(configOutput);
    selectedMachine.totalDuration += configOutput.testDurationMins;
  }

  const groups: ScheduleConfigTestGroup[] = machineStates.map((state) => ({
    configs: state.configs,
    machine: state.machine,
  }));

  return { groups };
}

function resolveConfigPath(config: ScheduleConfigInput): string {
  const resolvedPath = path.isAbsolute(config.path)
    ? config.path
    : path.resolve(REPO_ROOT, config.path);
  return require.resolve(resolvedPath);
}

function compareMachinePreference(left: MachineState, right: MachineState): number {
  if (left.machine.cpus !== right.machine.cpus) {
    return right.machine.cpus - left.machine.cpus;
  }

  if (left.machine.memoryMb !== right.machine.memoryMb) {
    return right.machine.memoryMb - left.machine.memoryMb;
  }

  return left.index - right.index;
}

function pickLargerMachine(candidate: MachineState, current: MachineState): MachineState {
  if (candidate.machine.cpus !== current.machine.cpus) {
    return candidate.machine.cpus > current.machine.cpus ? candidate : current;
  }

  if (candidate.machine.memoryMb !== current.machine.memoryMb) {
    return candidate.machine.memoryMb > current.machine.memoryMb ? candidate : current;
  }

  return candidate.index < current.index ? candidate : current;
}

function getPeakCpu(resources: ScheduleConfigOutput['resources']): number {
  return Math.max(resources.warming.cpu, resources.idle.cpu, resources.running.cpu);
}

function getPeakMemory(resources: ScheduleConfigOutput['resources']): number {
  return Math.max(resources.warming.memory, resources.idle.memory, resources.running.memory);
}
