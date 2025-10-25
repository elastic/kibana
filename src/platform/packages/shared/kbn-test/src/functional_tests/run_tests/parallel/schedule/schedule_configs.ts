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

interface MachineCapacity {
  cpu: number;
  memory: number;
}

type PhaseName = 'warming' | 'idle' | 'running';

const ZERO_SLOT_RESOURCES: SlotResources = {
  warming: { cpu: 0, memory: 0, exclusive: false },
  idle: { cpu: 0, memory: 0 },
  running: { cpu: 0, memory: 0, exclusive: false },
};

const resolveConfigPath = (v: string) => Path.resolve(REPO_ROOT, v);

const EPSILON = 0.000001;
const SCHEDULE_BUFFER_MINUTES = 2;

interface PhaseEstimate {
  name: PhaseName;
  duration: number;
  resources: {
    cpu: number;
    memory: number;
    exclusive?: boolean;
  };
}

interface PhaseAllocation {
  phase: PhaseName;
  start: number;
  end: number;
  cpu: number;
  memory: number;
  exclusive: boolean;
}

interface SimulationPhase {
  phase: PhaseName;
  start: number;
  end: number;
  resources: PhaseEstimate['resources'];
}

interface SimulationResult {
  phases: SimulationPhase[];
  finishTime: number;
}

interface MachineInstance {
  id: number;
  machine: {
    name: string;
    cpus: number;
    memoryMb: number;
  };
  capacity: MachineCapacity;
  allocations: PhaseAllocation[];
  finishTime: number;
  totalAssignedDuration: number;
  configs: ScheduleConfigOutput[];
  warmStartGuard: number;
}

interface CandidateScore {
  exceedsTarget: boolean;
  finishTime: number;
  projectedLoad: number;
  configCount: number;
  extension: number;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function estimatePhaseDurations(totalMinutes: number): Record<PhaseName, number> {
  // Estimate phase durations based on historic behaviour: warm ~15%, idle ~5%,
  // keep at least half of the time for the actual run. This keeps the scheduler
  // aware of phase contention without needing exact timings per config.
  if (totalMinutes <= 0) {
    return {
      warming: 0,
      idle: 0,
      running: 0,
    };
  }

  const desiredWarm = clamp(totalMinutes * 0.15, 1, Math.min(4, totalMinutes));
  const desiredIdle = clamp(totalMinutes * 0.05, 0.25, Math.min(2, totalMinutes));

  let warming = Math.min(desiredWarm, totalMinutes);
  let idle = Math.min(desiredIdle, totalMinutes - warming);
  let running = Math.max(totalMinutes - warming - idle, 0);

  const minimumRunning = clamp(totalMinutes * 0.5, 0, totalMinutes);

  if (running < minimumRunning) {
    let deficit = minimumRunning - running;

    const idleReduction = Math.min(deficit, Math.max(0, idle - 0.25));
    idle -= idleReduction;
    deficit -= idleReduction;

    const warmReduction = Math.min(deficit, Math.max(0, warming - 0.5));
    warming -= warmReduction;
    deficit -= warmReduction;

    running = Math.max(totalMinutes - warming - idle, 0);

    if (deficit > 0 && warming + idle > 0) {
      const scale = totalMinutes / (warming + idle + running || totalMinutes);
      warming *= scale;
      idle *= scale;
      running = Math.max(totalMinutes - warming - idle, 0);
    }
  }

  if (warming + idle + running > totalMinutes + EPSILON) {
    const scale = totalMinutes / (warming + idle + running);
    warming *= scale;
    idle *= scale;
    running = Math.max(totalMinutes - warming - idle, 0);
  }

  return {
    warming,
    idle,
    running,
  };
}

function buildPhaseEstimates(config: ScheduleConfigOutput): PhaseEstimate[] {
  const phases: PhaseEstimate[] = [];
  const durations = estimatePhaseDurations(config.testDurationMins);

  if (durations.warming > 0) {
    phases.push({
      name: 'warming',
      duration: durations.warming,
      resources: config.resources.warming,
    });
  }

  if (durations.idle > 0) {
    phases.push({
      name: 'idle',
      duration: durations.idle,
      resources: {
        cpu: config.resources.idle.cpu,
        memory: config.resources.idle.memory,
      },
    });
  }

  if (durations.running > 0) {
    phases.push({
      name: 'running',
      duration: durations.running,
      resources: config.resources.running,
    });
  }

  return phases;
}
function computeTotalPhaseDuration(phases: PhaseEstimate[]): number {
  return phases.reduce((sum, phase) => sum + phase.duration, 0);
}

function getFinishLimit(
  machine: MachineInstance,
  targetDuration: number,
  totalPhaseDuration: number
): number {
  const base = Math.max(machine.finishTime, targetDuration);
  return Math.max(base, totalPhaseDuration) + SCHEDULE_BUFFER_MINUTES;
}

function collectOverlaps(
  start: number,
  end: number,
  allocations: PhaseAllocation[]
): PhaseAllocation[] {
  return allocations.filter(
    (allocation) => allocation.start - end < EPSILON && allocation.end - start > EPSILON
  );
}

function hasCapacityInWindow(
  start: number,
  end: number,
  allocations: PhaseAllocation[],
  pending: PhaseAllocation[],
  capacity: MachineCapacity,
  phase: PhaseEstimate
): boolean {
  const overlapping = [
    ...collectOverlaps(start, end, allocations),
    ...collectOverlaps(start, end, pending),
  ];

  if (
    phase.resources.cpu - capacity.cpu > EPSILON ||
    phase.resources.memory - capacity.memory > EPSILON
  ) {
    return false;
  }

  if (overlapping.length === 0) {
    if (phase.resources.exclusive) {
      return true;
    }
    return (
      phase.resources.cpu - capacity.cpu <= EPSILON &&
      phase.resources.memory - capacity.memory <= EPSILON
    );
  }

  const eventPoints = new Set<number>([start, end]);

  for (const allocation of overlapping) {
    const overlapStart = Math.max(allocation.start, start);
    const overlapEnd = Math.min(allocation.end, end);

    eventPoints.add(overlapStart);
    eventPoints.add(overlapEnd);
  }

  const sortedPoints = Array.from(eventPoints).sort((a, b) => a - b);

  for (let index = 0; index < sortedPoints.length - 1; index += 1) {
    const segmentStart = sortedPoints[index];
    const segmentEnd = sortedPoints[index + 1];

    if (segmentEnd - segmentStart <= EPSILON) {
      continue;
    }

    const sample = (segmentStart + segmentEnd) / 2;
    let cpuUsage = phase.resources.cpu;
    let memoryUsage = phase.resources.memory;
    let warmingExclusiveCount = phase.name === 'warming' && phase.resources.exclusive ? 1 : 0;
    let runningExclusiveCount = phase.name === 'running' && phase.resources.exclusive ? 1 : 0;

    for (const allocation of overlapping) {
      if (allocation.start - sample > EPSILON || sample - allocation.end > EPSILON) {
        continue;
      }

      cpuUsage += allocation.cpu;
      memoryUsage += allocation.memory;

      if (allocation.phase === 'warming' && allocation.exclusive) {
        warmingExclusiveCount += 1;
      }

      if (allocation.phase === 'running' && allocation.exclusive) {
        runningExclusiveCount += 1;
      }
    }

    if (cpuUsage - capacity.cpu > EPSILON || memoryUsage - capacity.memory > EPSILON) {
      return false;
    }

    if (warmingExclusiveCount > 1 || runningExclusiveCount > 1) {
      return false;
    }
  }

  return true;
}

function findNextCandidateTime(
  start: number,
  end: number,
  allocations: PhaseAllocation[],
  pending: PhaseAllocation[]
): number | null {
  let nextTime = Number.POSITIVE_INFINITY;

  for (const allocation of allocations) {
    if (allocation.start - end >= EPSILON || start - allocation.end >= EPSILON) {
      continue;
    }

    if (allocation.end - start > EPSILON) {
      nextTime = Math.min(nextTime, allocation.end);
    }
  }

  for (const allocation of pending) {
    if (allocation.start - end >= EPSILON || start - allocation.end >= EPSILON) {
      continue;
    }

    if (allocation.end - start > EPSILON) {
      nextTime = Math.min(nextTime, allocation.end);
    }
  }

  return Number.isFinite(nextTime) ? nextTime : null;
}

function findPhaseStart(
  machine: MachineInstance,
  pending: PhaseAllocation[],
  phase: PhaseEstimate,
  earliestStart: number,
  finishLimit: number
): number | null {
  const duration = phase.duration;

  if (duration <= EPSILON) {
    return earliestStart;
  }

  let candidateStart = Math.max(earliestStart, machine.warmStartGuard);

  while (true) {
    const candidateEnd = candidateStart + duration;

    if (candidateEnd - finishLimit > EPSILON) {
      return null;
    }

    if (
      hasCapacityInWindow(
        candidateStart,
        candidateEnd,
        machine.allocations,
        pending,
        machine.capacity,
        phase
      )
    ) {
      return candidateStart;
    }

    const nextCandidate = findNextCandidateTime(
      candidateStart,
      candidateEnd,
      machine.allocations,
      pending
    );

    if (nextCandidate === null) {
      return null;
    }

    candidateStart = Math.max(nextCandidate, candidateStart + EPSILON);
  }
}

function simulatePlacement(
  machine: MachineInstance,
  phases: PhaseEstimate[],
  finishLimit: number
): SimulationResult | null {
  if (phases.length === 0) {
    return {
      phases: [],
      finishTime: machine.finishTime,
    };
  }

  const pendingAllocations: PhaseAllocation[] = [];
  const phaseResults: SimulationPhase[] = [];
  let earliestStart = machine.warmStartGuard;

  for (const phase of phases) {
    const start = findPhaseStart(machine, pendingAllocations, phase, earliestStart, finishLimit);
    if (start === null) {
      return null;
    }

    const end = start + phase.duration;

    pendingAllocations.push({
      phase: phase.name,
      start,
      end,
      cpu: phase.resources.cpu,
      memory: phase.resources.memory,
      exclusive: Boolean(phase.resources.exclusive),
    });

    phaseResults.push({
      phase: phase.name,
      start,
      end,
      resources: phase.resources,
    });

    earliestStart = end;
  }

  const finishTime = phaseResults[phaseResults.length - 1]?.end ?? machine.finishTime;

  if (finishTime - finishLimit > EPSILON) {
    return null;
  }

  return {
    phases: phaseResults,
    finishTime,
  };
}

function applySimulation(
  machine: MachineInstance,
  simulation: SimulationResult,
  config: ScheduleConfigOutput
) {
  const startTime = simulation.phases[0]?.start ?? machine.finishTime;
  config.startTimeMins = startTime;

  if (simulation.phases.length === 0) {
    machine.configs.push(config);
    machine.totalAssignedDuration += config.testDurationMins;
    return;
  }

  for (const phase of simulation.phases) {
    machine.allocations.push({
      phase: phase.phase,
      start: phase.start,
      end: phase.end,
      cpu: phase.resources.cpu,
      memory: phase.resources.memory,
      exclusive: Boolean(phase.resources.exclusive),
    });
  }

  machine.allocations.sort((a, b) => a.start - b.start);
  machine.finishTime = Math.max(machine.finishTime, simulation.finishTime);
  machine.totalAssignedDuration += config.testDurationMins;
  machine.configs.push(config);

  const warmStart = simulation.phases.find((phaseEntry) => phaseEntry.phase === 'warming')?.start;
  if (warmStart !== undefined) {
    machine.warmStartGuard = Math.max(machine.warmStartGuard, warmStart + EPSILON);
  }
}

function scoreSimulation(
  simulation: SimulationResult,
  machine: MachineInstance,
  finishLimit: number,
  addedDuration: number
): CandidateScore {
  const finishTime = simulation.finishTime;
  const projectedLoad = machine.totalAssignedDuration + addedDuration;
  const exceedsTarget = finishTime - finishLimit > EPSILON && addedDuration > EPSILON;
  const extension = Math.max(0, finishTime - machine.finishTime);

  return {
    exceedsTarget,
    finishTime,
    projectedLoad,
    configCount: machine.configs.length,
    extension,
  };
}

function isBetterScore(candidate: CandidateScore, incumbent: CandidateScore | undefined): boolean {
  if (!incumbent) {
    return true;
  }

  if (candidate.exceedsTarget !== incumbent.exceedsTarget) {
    return candidate.exceedsTarget < incumbent.exceedsTarget;
  }

  if (Math.abs(candidate.finishTime - incumbent.finishTime) > EPSILON) {
    return candidate.finishTime < incumbent.finishTime;
  }

  if (Math.abs(candidate.extension - incumbent.extension) > EPSILON) {
    return candidate.extension < incumbent.extension;
  }

  if (Math.abs(candidate.projectedLoad - incumbent.projectedLoad) > EPSILON) {
    return candidate.projectedLoad < incumbent.projectedLoad;
  }

  return candidate.configCount < incumbent.configCount;
}

function createMachineInstance(
  id: number,
  machineTemplate: { name: string; cpus: number; memoryMb: number }
): MachineInstance {
  const effectiveCpu = Math.max(1, machineTemplate.cpus);

  return {
    id,
    machine: { ...machineTemplate },
    capacity: {
      cpu: effectiveCpu,
      memory: machineTemplate.memoryMb,
    },
    allocations: [],
    finishTime: 0,
    totalAssignedDuration: 0,
    configs: [],
    warmStartGuard: 0,
  };
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

  const configsWithResources = await Promise.all(
    configs.map(async (configInput): Promise<ScheduleConfigOutput> => {
      const absoluteConfigPath = resolveConfigPath(configInput.path);
      const configObject = await readConfig(toolingLog, absoluteConfigPath, {});

      const hasTests = await checkForEnabledTestsInFtrConfig({
        config: configObject,
        esVersion: EsVersion.getDefault(),
        log: toolingLog,
      });

      if (!hasTests) {
        return {
          path: configInput.path,
          testDurationMins: 0,
          resources: ZERO_SLOT_RESOURCES,
          tooLong: false,
        };
      }

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

  const sortedMachines = machines.slice().sort((a, b) => {
    if (a.cpus !== b.cpus) return b.cpus - a.cpus;
    if (a.memoryMb !== b.memoryMb) return b.memoryMb - a.memoryMb;
    return a.name.localeCompare(b.name);
  });

  const largestMachineOriginal = sortedMachines[0];

  if (!largestMachineOriginal) {
    throw new Error('Unable to determine largest machine type for scheduling');
  }

  const largestMachineType = {
    ...largestMachineOriginal,
    cpus: largestMachineOriginal.cpus,
  };

  const maxParallelism = Math.max(1, Math.floor(largestMachineType.cpus / 2));
  const totalDuration = configsWithResources.reduce(
    (sum, cfg) => sum + Math.max(cfg.testDurationMins, 0),
    0
  );
  const sanitizedMaxDuration = Math.max(maxDurationMins, 1);
  const minimumInstances = Math.max(
    1,
    Math.ceil(totalDuration / (maxParallelism * sanitizedMaxDuration))
  );

  const machineInstances: MachineInstance[] = [];

  for (let index = 0; index < minimumInstances; index += 1) {
    machineInstances.push(createMachineInstance(index, largestMachineType));
  }

  let nextInstanceId = machineInstances.length;

  const sortedConfigs = configsWithResources.slice().sort((a, b) => {
    if (b.testDurationMins !== a.testDurationMins) {
      return b.testDurationMins - a.testDurationMins;
    }

    return a.path.localeCompare(b.path);
  });

  for (const config of sortedConfigs) {
    const phases = buildPhaseEstimates(config);
    const totalPhaseDuration = computeTotalPhaseDuration(phases);

    let bestMachine: MachineInstance | null = null;
    let bestSimulation: SimulationResult | null = null;
    let bestScore: CandidateScore | undefined;
    let isNewMachine = false;

    for (const machine of machineInstances) {
      const finishLimit = getFinishLimit(machine, sanitizedMaxDuration, totalPhaseDuration);
      const simulation = simulatePlacement(machine, phases, finishLimit);

      if (!simulation) {
        continue;
      }

      const score = scoreSimulation(simulation, machine, finishLimit, config.testDurationMins);

      if (isBetterScore(score, bestScore)) {
        bestMachine = machine;
        bestSimulation = simulation;
        bestScore = score;
        isNewMachine = false;
      }
    }

    const shouldConsiderNewMachine =
      (!bestScore || bestScore.exceedsTarget) && config.testDurationMins > EPSILON;

    if (shouldConsiderNewMachine) {
      const newMachineCandidate = createMachineInstance(nextInstanceId, largestMachineType);
      const finishLimit = getFinishLimit(
        newMachineCandidate,
        sanitizedMaxDuration,
        totalPhaseDuration
      );
      const newMachineSimulation = simulatePlacement(newMachineCandidate, phases, finishLimit);

      if (newMachineSimulation) {
        const score = scoreSimulation(
          newMachineSimulation,
          newMachineCandidate,
          finishLimit,
          config.testDurationMins
        );

        if (isBetterScore(score, bestScore)) {
          bestMachine = newMachineCandidate;
          bestSimulation = newMachineSimulation;
          bestScore = score;
          isNewMachine = true;
        }
      }
    }

    if (!bestMachine || !bestSimulation) {
      throw new Error(`Unable to schedule config ${config.path}`);
    }

    applySimulation(bestMachine, bestSimulation, config);

    if (isNewMachine) {
      machineInstances.push(bestMachine);
      nextInstanceId += 1;
    }
  }

  const groups = machineInstances
    .filter((instance) => instance.configs.length > 0)
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
        machine: { ...instance.machine },
        expectedDurationMins: Number(instance.finishTime.toFixed(2)),
      };
    });

  return {
    groups,
  };
}
