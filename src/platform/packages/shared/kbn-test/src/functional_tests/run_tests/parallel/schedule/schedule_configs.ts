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

interface MachineCapacity {
  cpu: number;
  memory: number;
}

type PhaseName = 'warming' | 'idle' | 'running';

interface PhaseSegment {
  start: number;
  end: number;
  cpu: number;
  memory: number;
  exclusive: boolean;
  phase: PhaseName;
}

interface ScheduledAssignment {
  config: ScheduleConfigOutput;
  warmStart: number;
  runStart: number;
}

interface MachineState {
  machineType: ScheduleConfigOptions['machines'][number];
  capacity: MachineCapacity;
  segments: PhaseSegment[];
  assignments: ScheduledAssignment[];
  wallClockEnd: number;
  index: number;
  enforceCapacity: boolean;
}

interface PlacementResult {
  segments: PhaseSegment[];
  warmStart: number;
  warmEnd: number;
  runStart: number;
  runEnd: number;
}

interface ScheduleAttempt {
  segments: PhaseSegment[];
  warmStart: number;
  warmEnd: number;
  runStart: number;
  runEnd: number;
  wallTime: number;
}

const RESOURCE_EPSILON = 0.000001;
const MEMORY_RESERVE_MB = 2048;
const MEMORY_BUFFER_RATIO = 0.2;
const WARMING_DURATION_MINUTES = 90 / 60;
const MIN_TIME_INCREMENT = 0.01;
const TIME_EPSILON = 0.000001;
const MAX_SCHEDULING_ATTEMPTS = 1000;

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

  // Sort by duration (largest first) for a greedy longest-processing-time assignment.
  const sortedConfigs = [...configsWithResources].sort(
    (left, right) => right.testDurationMins - left.testDurationMins
  );

  for (const configOutput of sortedConfigs) {
    // determine which machine types are capable of running this config
    const eligibleTypes = machineTypes.filter((type) =>
      canRunConfigOnMachine(type, configOutput.resources)
    );

    // If no machine type can fit this config, fall back to the largest machine type
    // (which is already sorted at the front of machineTypes)
    const typesToConsider = eligibleTypes.length > 0 ? eligibleTypes : [machineTypes[0]];

    const eligibleInstances = machineStates.filter((state) =>
      typesToConsider.some((type) => type.name === state.machineType.name)
    );

    const placementAttempts = eligibleInstances
      .map((state) => {
        const attempt = tryScheduleOnMachine(state, configOutput);
        return attempt ? { state, attempt } : undefined;
      })
      .filter(
        (value): value is { state: MachineState; attempt: ScheduleAttempt } => value !== undefined
      );

    const placementsWithinTarget = placementAttempts.filter(
      ({ attempt }) => attempt.wallTime <= maxDurationMins + TIME_EPSILON
    );

    const placementsWithoutExtension = placementAttempts.filter(({ state, attempt }) => {
      if (state.assignments.length === 0) {
        return false;
      }

      return attempt.wallTime <= state.wallClockEnd + TIME_EPSILON;
    });

    const candidatePlacements =
      placementsWithinTarget.length > 0 ? placementsWithinTarget : placementsWithoutExtension;

    let selectedPlacement: { state: MachineState; attempt: ScheduleAttempt } | undefined;

    if (candidatePlacements.length > 0) {
      candidatePlacements.sort((left, right) => {
        const cpuDiff = right.state.machineType.cpus - left.state.machineType.cpus;
        if (cpuDiff !== 0) {
          return cpuDiff;
        }

        const memoryDiff = right.state.machineType.memoryMb - left.state.machineType.memoryMb;
        if (memoryDiff !== 0) {
          return memoryDiff;
        }

        const wallDiff = left.attempt.wallTime - right.attempt.wallTime;
        if (Math.abs(wallDiff) > TIME_EPSILON) {
          return wallDiff;
        }

        return left.state.index - right.state.index;
      });

      [selectedPlacement] = candidatePlacements;
    }

    if (!selectedPlacement) {
      const chosenType = typesToConsider[0];
      const isForcedPlacement = eligibleTypes.length === 0;

      const newInstance: MachineState = {
        machineType: chosenType,
        capacity: createMachineCapacity(chosenType),
        segments: [],
        assignments: [],
        wallClockEnd: 0,
        index: machineStates.length,
        enforceCapacity: !isForcedPlacement,
      };

      const attempt = tryScheduleOnMachine(newInstance, configOutput);

      if (!attempt) {
        throw new Error(`Unable to schedule config ${configOutput.path} on ${chosenType.name}`);
      }

      applyScheduleAttempt(newInstance, attempt, configOutput);
      machineStates.push(newInstance);
      continue;
    }

    applyScheduleAttempt(selectedPlacement.state, selectedPlacement.attempt, configOutput);
  }

  const groups: ScheduleConfigTestGroup[] = machineStates
    .filter((state) => state.assignments.length > 0)
    .map((state) => {
      const orderedConfigs = [...state.assignments]
        .sort((left, right) => {
          if (Math.abs(left.warmStart - right.warmStart) > TIME_EPSILON) {
            return left.warmStart - right.warmStart;
          }

          return left.runStart - right.runStart;
        })
        .map((assignment) => assignment.config);

      return {
        configs: orderedConfigs,
        machine: state.machineType,
        expectedDurationMins: Math.max(0, state.wallClockEnd),
      };
    });

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
  const memoryCapacity = applyMemorySafetyBuffer(machine.memoryMb);

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

function tryScheduleOnMachine(
  state: MachineState,
  config: ScheduleConfigOutput
): ScheduleAttempt | undefined {
  const placement = computePlacement(state.segments, state.capacity, config, state.enforceCapacity);

  if (!placement) {
    return undefined;
  }

  return {
    ...placement,
    wallTime: Math.max(state.wallClockEnd, placement.runEnd),
  };
}

function applyScheduleAttempt(
  state: MachineState,
  attempt: ScheduleAttempt,
  config: ScheduleConfigOutput
): void {
  state.segments = mergeSegments(state.segments, attempt.segments);
  state.wallClockEnd = Math.max(state.wallClockEnd, attempt.wallTime);
  state.assignments.push({
    config,
    warmStart: attempt.warmStart,
    runStart: attempt.runStart,
  });
}

function computePlacement(
  existingSegments: PhaseSegment[],
  capacity: MachineCapacity,
  config: ScheduleConfigOutput,
  enforceCapacity: boolean
): PlacementResult | null {
  const forceExclusive = !enforceCapacity;
  const warmStart = findIntervalStart(
    existingSegments,
    capacity,
    0,
    WARMING_DURATION_MINUTES,
    config.resources.warming,
    'warming',
    enforceCapacity,
    forceExclusive
  );

  if (warmStart === null) {
    return null;
  }

  const warmEnd = warmStart + WARMING_DURATION_MINUTES;
  const warmSegment = createSegment(
    'warming',
    warmStart,
    warmEnd,
    config.resources.warming,
    forceExclusive
  );
  const segmentsWithWarm = mergeSegments(existingSegments, [warmSegment]);

  const runPlacement = findRunPlacement(
    segmentsWithWarm,
    capacity,
    warmEnd,
    config,
    enforceCapacity,
    forceExclusive
  );

  if (!runPlacement) {
    return null;
  }

  const newSegments: PhaseSegment[] = [warmSegment];

  if (runPlacement.idleSegment) {
    newSegments.push(runPlacement.idleSegment);
  }

  newSegments.push(runPlacement.runSegment);

  newSegments.sort((left, right) => {
    if (Math.abs(left.start - right.start) > TIME_EPSILON) {
      return left.start - right.start;
    }

    return left.end - right.end;
  });

  return {
    segments: newSegments,
    warmStart,
    warmEnd,
    runStart: runPlacement.runStart,
    runEnd: runPlacement.runSegment.end,
  };
}

interface RunPlacementResult {
  runStart: number;
  runSegment: PhaseSegment;
  idleSegment?: PhaseSegment;
}

function findRunPlacement(
  segments: PhaseSegment[],
  capacity: MachineCapacity,
  earliestRunStart: number,
  config: ScheduleConfigOutput,
  enforceCapacity: boolean,
  forceExclusive: boolean
): RunPlacementResult | null {
  const runDuration = Math.max(config.testDurationMins, 0);
  const runningResources = config.resources.running;
  const idleResources = config.resources.idle;

  let attempts = 0;
  let runStart = earliestRunStart;

  while (attempts < MAX_SCHEDULING_ATTEMPTS) {
    const runCheck = intervalFits(
      segments,
      capacity,
      runStart,
      runStart + runDuration,
      runningResources,
      'running',
      enforceCapacity,
      forceExclusive
    );

    if (!runCheck.ok) {
      runStart = Math.max(runCheck.nextStart, runStart + MIN_TIME_INCREMENT);
      attempts += 1;
      continue;
    }

    const idleStart = earliestRunStart;
    const idleEnd = runStart;

    if (idleEnd - idleStart > TIME_EPSILON) {
      const idleCheck = intervalFits(
        segments,
        capacity,
        idleStart,
        idleEnd,
        idleResources,
        'idle',
        enforceCapacity,
        forceExclusive
      );

      if (!idleCheck.ok) {
        runStart = Math.max(idleCheck.nextStart, runStart + MIN_TIME_INCREMENT);
        attempts += 1;
        continue;
      }
    }

    const runSegment = createSegment(
      'running',
      runStart,
      runStart + runDuration,
      runningResources,
      forceExclusive
    );
    const idleSegment =
      idleEnd - idleStart > TIME_EPSILON
        ? createSegment('idle', idleStart, idleEnd, idleResources, forceExclusive)
        : undefined;

    return {
      runStart,
      runSegment,
      idleSegment,
    };
  }

  return null;
}

function findIntervalStart(
  segments: PhaseSegment[],
  capacity: MachineCapacity,
  earliestStart: number,
  duration: number,
  resources: ScheduleConfigOutput['resources'][keyof ScheduleConfigOutput['resources']],
  phase: PhaseName,
  enforceCapacity: boolean,
  forceExclusive: boolean
): number | null {
  if (duration <= TIME_EPSILON) {
    return Math.max(0, earliestStart);
  }

  let start = Math.max(0, earliestStart);
  let attempts = 0;

  while (attempts < MAX_SCHEDULING_ATTEMPTS) {
    const check = intervalFits(
      segments,
      capacity,
      start,
      start + duration,
      resources,
      phase,
      enforceCapacity,
      forceExclusive
    );

    if (check.ok) {
      return start;
    }

    start = Math.max(check.nextStart, start + MIN_TIME_INCREMENT);
    attempts += 1;
  }

  return null;
}

function intervalFits(
  segments: PhaseSegment[],
  capacity: MachineCapacity,
  start: number,
  end: number,
  resources: ScheduleConfigOutput['resources'][keyof ScheduleConfigOutput['resources']],
  phase: PhaseName,
  enforceCapacity: boolean,
  forceExclusive: boolean
): { ok: true } | { ok: false; nextStart: number } {
  if (end - start <= TIME_EPSILON) {
    return { ok: true };
  }

  const exclusivePhase = forceExclusive || isExclusivePhase(resources);
  const eventTimes = new Set<number>([start, end]);

  for (const segment of segments) {
    eventTimes.add(segment.start);
    eventTimes.add(segment.end);
  }

  const sortedEvents = Array.from(eventTimes).sort((left, right) => left - right);

  for (let index = 0; index < sortedEvents.length - 1; index += 1) {
    const windowStart = Math.max(sortedEvents[index], start);
    const windowEnd = Math.min(sortedEvents[index + 1], end);

    if (windowEnd - windowStart <= TIME_EPSILON) {
      continue;
    }

    const sample = windowStart + (windowEnd - windowStart) / 2;
    const usage = usageAt(sample, segments, phase);

    if (enforceCapacity) {
      const cpuTotal = usage.cpu + resources.cpu;
      if (cpuTotal - capacity.cpu > RESOURCE_EPSILON) {
        return {
          ok: false,
          nextStart: Math.max(sortedEvents[index + 1], start + MIN_TIME_INCREMENT),
        };
      }

      const memoryTotal = usage.memory + resources.memory;
      if (memoryTotal - capacity.memory > RESOURCE_EPSILON) {
        return {
          ok: false,
          nextStart: Math.max(sortedEvents[index + 1], start + MIN_TIME_INCREMENT),
        };
      }
    }

    if (exclusivePhase && usage.hasExclusivePhase) {
      return {
        ok: false,
        nextStart: Math.max(sortedEvents[index + 1], start + MIN_TIME_INCREMENT),
      };
    }
  }

  return { ok: true };
}

function usageAt(time: number, segments: PhaseSegment[], phase: PhaseName) {
  let cpu = 0;
  let memory = 0;
  let hasExclusivePhase = false;

  for (const segment of segments) {
    if (!segmentActiveAt(segment, time)) {
      continue;
    }

    cpu += segment.cpu;
    memory += segment.memory;

    if (segment.phase === phase && segment.exclusive) {
      hasExclusivePhase = true;
    }
  }

  return { cpu, memory, hasExclusivePhase };
}

function segmentActiveAt(segment: PhaseSegment, time: number): boolean {
  return time >= segment.start - TIME_EPSILON && time < segment.end - TIME_EPSILON;
}

function mergeSegments(existing: PhaseSegment[], additions: PhaseSegment[]): PhaseSegment[] {
  const filtered = additions.filter((segment) => segment.end - segment.start > TIME_EPSILON);
  return [...existing, ...filtered].sort((left, right) => {
    if (Math.abs(left.start - right.start) > TIME_EPSILON) {
      return left.start - right.start;
    }

    if (Math.abs(left.end - right.end) > TIME_EPSILON) {
      return left.end - right.end;
    }

    return left.phase.localeCompare(right.phase);
  });
}

function createMachineCapacity(
  machine: ScheduleConfigOptions['machines'][number]
): MachineCapacity {
  return {
    cpu: Math.max(1, machine.cpus),
    memory: applyMemorySafetyBuffer(machine.memoryMb),
  };
}

function createSegment(
  phase: PhaseName,
  start: number,
  end: number,
  resources: ScheduleConfigOutput['resources'][keyof ScheduleConfigOutput['resources']],
  forceExclusive = false
): PhaseSegment {
  return {
    start,
    end,
    cpu: resources.cpu,
    memory: resources.memory,
    exclusive: forceExclusive ? true : isExclusivePhase(resources),
    phase,
  };
}

function isExclusivePhase(
  resources: ScheduleConfigOutput['resources'][keyof ScheduleConfigOutput['resources']]
): boolean {
  return 'exclusive' in resources && Boolean((resources as { exclusive?: boolean }).exclusive);
}

function applyMemorySafetyBuffer(memoryMb: number): number {
  if (memoryMb <= 0) {
    return 0;
  }

  const availableMemory = Math.max(memoryMb - MEMORY_RESERVE_MB, 0);
  const bufferedMemory = availableMemory * (1 - MEMORY_BUFFER_RATIO);

  return Math.max(bufferedMemory, 0);
}
