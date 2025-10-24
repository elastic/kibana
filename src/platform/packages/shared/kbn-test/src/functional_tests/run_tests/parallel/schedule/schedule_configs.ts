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

const RESOURCE_EPSILON = 0.000001;
const MEMORY_RESERVE_MB = 2048;

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

  // machines input is a list of machine TYPES. We'll expand them into runtime
  // instances (MachineState) on demand. Sort types by preference (largest
  // capacity first) so we always create new instances from the largest type when
  // needed.
  const machineTypes = machines.slice().sort((a, b) => {
    if (a.cpus !== b.cpus) return b.cpus - a.cpus;
    if (a.memoryMb !== b.memoryMb) return b.memoryMb - a.memoryMb;
    return a.name.localeCompare(b.name);
  });

  const machineStates: MachineState[] = [];
  const typeInstanceCounters = new Map<string, number>();

  // Sort by duration (largest first) for a greedy longest-processing-time assignment.
  const sortedConfigs = [...configsWithResources].sort(
    (left, right) => right.testDurationMins - left.testDurationMins
  );

  for (const configOutput of sortedConfigs) {
    // determine which machine types are capable of running this config
    const eligibleTypes = machineTypes.filter((type) =>
      canRunConfigOnMachine(type, configOutput.resources)
    );

    if (eligibleTypes.length === 0) {
      throw new Error(`Config ${configOutput.path} requires resources that no machines provide`);
    }

    // Try to pack into existing runtime instances of eligible types. Prefer
    // filling larger types first.
    const eligibleInstances = machineStates.filter((state) =>
      canRunConfigOnMachine(state.machine, configOutput.resources)
    );

    const machinesWithinLimit = eligibleInstances.filter(
      (state) => state.totalDuration + configOutput.testDurationMins <= maxDurationMins
    );

    const preferPacking = machinesWithinLimit.length > 0;
    const candidatePool = preferPacking ? machinesWithinLimit : eligibleInstances;

    function candidateComparator(a: MachineState, b: MachineState): number {
      // prefer larger machines first
      if (a.machine.cpus !== b.machine.cpus) {
        return b.machine.cpus - a.machine.cpus;
      }

      if (a.machine.memoryMb !== b.machine.memoryMb) {
        return b.machine.memoryMb - a.machine.memoryMb;
      }

      // when packing prefer machines with more already assigned work (fill them up)
      if (preferPacking) {
        if (a.totalDuration !== b.totalDuration) return b.totalDuration - a.totalDuration;
      } else {
        if (a.totalDuration !== b.totalDuration) return a.totalDuration - b.totalDuration;
      }

      return a.index - b.index;
    }

    let selectedMachine = candidatePool.slice().sort(candidateComparator)[0];

    // If no existing instance could be used, create a new instance on the
    // largest eligible type.
    if (!selectedMachine) {
      const chosenType = eligibleTypes[0];
      const nextCount = (typeInstanceCounters.get(chosenType.name) ?? 0) + 1;
      typeInstanceCounters.set(chosenType.name, nextCount);

      const newInstance: MachineState = {
        machine: {
          name: `${chosenType.name}-${nextCount}`,
          cpus: chosenType.cpus,
          memoryMb: chosenType.memoryMb,
        },
        configs: [],
        totalDuration: 0,
        index: machineStates.length,
      };

      machineStates.push(newInstance);
      selectedMachine = newInstance;
    }

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
// Mirrors the resource admission checks from ResourcePool to determine whether a
// slot can run on the provided machine definition. We assume warming lasts a
// few minutes (1-3m) just like ResourcePool does when dealing with real runs.
function canRunConfigOnMachine(
  machine: ScheduleConfigOptions['machines'][number],
  resources: ScheduleConfigOutput['resources']
): boolean {
  const cpuCapacity = Math.max(1, machine.cpus);
  const memoryCapacity = Math.max(machine.memoryMb - MEMORY_RESERVE_MB, 0);

  const warmingFits = phaseFitsCapacity(
    resources.warming.cpu,
    resources.warming.memory,
    cpuCapacity,
    memoryCapacity
  );

  if (!warmingFits) {
    return false;
  }

  const idleFits = phaseFitsCapacity(
    resources.idle.cpu,
    resources.idle.memory,
    cpuCapacity,
    memoryCapacity
  );

  if (!idleFits) {
    return false;
  }

  return phaseFitsCapacity(
    resources.running.cpu,
    resources.running.memory,
    cpuCapacity,
    memoryCapacity
  );
}

function phaseFitsCapacity(
  cpuRequired: number,
  memoryRequired: number,
  cpuCapacity: number,
  memoryCapacity: number
): boolean {
  if (cpuRequired - cpuCapacity > RESOURCE_EPSILON) {
    return false;
  }

  if (memoryRequired - memoryCapacity > RESOURCE_EPSILON) {
    return false;
  }

  return true;
}
