/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HeapProfiler, Profiler } from 'node:inspector';
import type { ProfileType } from '../../common';
import type { InspectorSession } from './inspector';

export type ProfileData = Profiler.Profile | HeapProfiler.SamplingHeapProfile;

export interface ProfilerCommands {
  readonly start: (session: InspectorSession) => Promise<void>;
  readonly stop: (session: InspectorSession) => Promise<ProfileData>;
}

/** Starts a CPU profile with the CDP Profiler domain. */
export async function startCpuProfile(session: InspectorSession): Promise<void> {
  await session.post('Profiler.enable');
  await session.post('Profiler.start');
}

/** Stops the CPU profile started by `startCpuProfile` and returns it. */
export async function stopCpuProfile(session: InspectorSession): Promise<Profiler.Profile> {
  const { profile } = await session.post('Profiler.stop');
  await session.post('Profiler.disable');
  return profile;
}

/** Starts a sampling heap profile with the CDP HeapProfiler domain. */
export async function startMemoryProfile(session: InspectorSession): Promise<void> {
  await session.post('HeapProfiler.enable');
  await session.post('HeapProfiler.startSampling');
}

/** Stops the sampling heap profile started by `startMemoryProfile` and returns it. */
export async function stopMemoryProfile(
  session: InspectorSession
): Promise<HeapProfiler.SamplingHeapProfile> {
  const { profile } = await session.post('HeapProfiler.getSamplingProfile');
  await session.post('HeapProfiler.stopSampling');
  await session.post('HeapProfiler.disable');
  return profile;
}

export const profilerCommands: Readonly<Record<ProfileType, ProfilerCommands>> = {
  cpu: { start: startCpuProfile, stop: stopCpuProfile },
  memory: { start: startMemoryProfile, stop: stopMemoryProfile },
};
