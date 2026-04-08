/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolingLog } from '@kbn/tooling-log';
import { readProfile } from './read_profile';
import { writeProfile } from './write_profile';
import type { CpuProfile } from './types';
import { remapNodesSequential } from './remap_nodes';

interface Options {
  log: ToolingLog;
  name: string;
  out: string;
  profilePaths: string[];
  pollIntervalMs?: number;
  totalTimeoutMs?: number;
  inactivityTimeoutMs?: number;
}

/**
 * Concatenate multiple CPU profile JSON files sequentially, ensuring contiguous node ids
 * and sequential, non-overlapping timing.
 */
export async function concatenateProfiles({
  log,
  name,
  out,
  profilePaths,
  pollIntervalMs,
  totalTimeoutMs,
  inactivityTimeoutMs,
}: Options): Promise<string> {
  if (profilePaths.length === 0) {
    await writeProfile(out, {
      nodes: [],
      samples: [],
      timeDeltas: [],
      startTime: 0,
      endTime: 0,
      title: name,
    });
    return out;
  }

  if (profilePaths.length === 1) {
    const profile = await readProfile(profilePaths[0], log, {
      pollIntervalMs,
      totalTimeoutMs,
      inactivityTimeoutMs,
    });
    profile.title = name;
    await writeProfile(out, profile);
    return out;
  }

  // Read all profiles
  const profiles: CpuProfile[] = [];
  for (const p of profilePaths) {
    const prof = await readProfile(p, log, {
      pollIntervalMs,
      totalTimeoutMs,
      inactivityTimeoutMs,
    });
    profiles.push(prof);
  }

  // Sort by startTime ascending (missing -> 0)
  profiles.sort(
    (a, b) => (a.startTime ?? 0) - (b.startTime ?? 0) || (a.endTime ?? 0) - (b.endTime ?? 0)
  );

  const merged: CpuProfile = {
    nodes: [],
    samples: [],
    timeDeltas: [],
    startTime: profiles[0].startTime ?? 0,
    endTime: 0,
    title: name,
  };

  let accDuration = 0; // accumulated duration from first profile start
  for (const profile of profiles) {
    const duration =
      typeof profile.endTime === 'number' && typeof profile.startTime === 'number'
        ? profile.endTime - profile.startTime
        : profile.timeDeltas.reduce((a, b) => a + b, 0);

    // Remap & append nodes, samples
    remapNodesSequential({ source: profile, target: merged });

    // Cannot use spread here because profile.timeDeltas is very large and causes stack overflow
    for (const delta of profile.timeDeltas) {
      // Append time deltas directly (sequential mode)
      merged.timeDeltas.push(delta);
    }

    accDuration += duration;
  }

  merged.endTime = (merged.startTime ?? 0) + accDuration;

  await writeProfile(out, merged);
  return out;
}
