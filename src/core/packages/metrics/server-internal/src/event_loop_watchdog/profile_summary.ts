/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { sanitize } from './sanitize';
import type { ProfileFrame, ProfileSummary } from './types';

/** Minimal subset of the V8 `Profiler.Profile` shape used here. Times are microseconds. */
export interface CpuProfile {
  nodes: Array<{
    id: number;
    callFrame: { functionName: string; url: string; lineNumber: number };
    children?: number[];
  }>;
  startTime: number;
  endTime: number;
  samples?: number[];
  timeDeltas?: number[];
}

export interface SummarizeOptions {
  /** Block window on the worker's `process.hrtime` clock, in microseconds. */
  windowStartUs: number;
  windowEndUs: number;
  /**
   * `process.hrtime` (µs) at which the worker received the `Profiler.start` acknowledgement.
   * The V8 profile clock is not guaranteed to match `process.hrtime` (it differs on macOS), so
   * sample times are aligned by assuming the profile started just before this acknowledgement.
   */
  startAckUs: number;
  sanitizeRoot: string;
  maxFrames: number;
}

const IDLE = '(idle)';
const PROGRAM = '(program)';
const GC = '(garbage collector)';
const ROOT = '(root)';
/** Share of the profiled part of the block that must be JS/GC samples to trust the profile. */
const MIN_COVERAGE = 0.5;
const MIN_SAMPLED_US = 10_000;
const MAX_CALLERS = 3;

/** Returns a repo-relative path, a `node:` specifier, or a basename. Drops query strings. */
export const sanitizeLocation = (url: string, lineNumber: number, root: string): string => {
  if (!url) return '';
  let path = url.replace(/^file:\/\//, '').replace(/[?#].*$/, '');
  const normalizedRoot = root.endsWith('/') ? root : `${root}/`;
  if (path.startsWith(normalizedRoot)) {
    path = path.slice(normalizedRoot.length);
  } else if (!path.startsWith('node:')) {
    path = path.slice(path.lastIndexOf('/') + 1);
  }
  return sanitize(lineNumber >= 0 ? `${path}:${lineNumber + 1}` : path);
};

const round = (value: number) => Math.round(value * 10) / 10;

/** Summarises the samples of `profile` falling within the block window. */
export const summarizeProfile = (
  profile: CpuProfile,
  { windowStartUs, windowEndUs, startAckUs, sanitizeRoot, maxFrames }: SummarizeOptions
): ProfileSummary => {
  const samples = profile.samples ?? [];
  const deltas = profile.timeDeltas ?? [];
  const offset = profile.startTime - startAckUs;
  const profiledFromUs = Math.max(windowStartUs, profile.startTime - offset);
  const profiledUs = windowEndUs - profiledFromUs;

  if (profiledUs < MIN_SAMPLED_US) {
    return {
      verdict: 'inconclusive',
      reason:
        'the profiler only started after the block ended (typical for native code or synchronous syscalls, which do not service inspector interrupts)',
      frames: [],
    };
  }

  const nodesById = new Map(profile.nodes.map((node) => [node.id, node]));
  const parentById = new Map<number, number>();
  for (const { id, children = [] } of profile.nodes) {
    for (const child of children) parentById.set(child, id);
  }
  const describe = (nodeId: number): string | undefined => {
    const node = nodesById.get(nodeId);
    if (!node || node.callFrame.functionName === ROOT) return undefined;
    const { functionName, url, lineNumber } = node.callFrame;
    const location = sanitizeLocation(url, lineNumber, sanitizeRoot);
    return sanitize(
      `${sanitize(functionName || '(anonymous)')}${location ? ` (${location})` : ''}`
    );
  };
  const callersOf = (nodeId: number): string[] => {
    const callers: string[] = [];
    let parent = parentById.get(nodeId);
    while (parent !== undefined && callers.length < MAX_CALLERS) {
      const description = describe(parent);
      if (!description) break;
      callers.push(description);
      parent = parentById.get(parent);
    }
    return callers;
  };
  const selfUs = new Map<number, number>();
  let sampleTimeUs = profile.startTime - offset;
  let jsUs = 0;
  let gcUs = 0;

  samples.forEach((nodeId, index) => {
    const delta = deltas[index] ?? 0;
    sampleTimeUs += delta;
    if (sampleTimeUs < windowStartUs || sampleTimeUs > windowEndUs) return;
    const name = nodesById.get(nodeId)?.callFrame.functionName;
    if (name === IDLE || name === PROGRAM || name === ROOT) return;
    if (name === GC) gcUs += delta;
    jsUs += delta;
    selfUs.set(nodeId, (selfUs.get(nodeId) ?? 0) + delta);
  });

  const coverage = jsUs / profiledUs;
  if (jsUs < MIN_SAMPLED_US || coverage < MIN_COVERAGE) {
    return {
      verdict: 'inconclusive',
      reason: `only ${Math.round(coverage * 100)}% of the profiled ${Math.round(
        profiledUs / 1000
      )}ms of the block contained JS samples (native code, syscalls or OS scheduling are likely)`,
      frames: [],
    };
  }

  // aggregate by function+location; callers are taken from the heaviest contributing node
  const aggregated = new Map<string, ProfileFrame & { heaviestUs: number }>();
  for (const [nodeId, us] of selfUs) {
    const node = nodesById.get(nodeId);
    if (!node) continue;
    const functionName = sanitize(node.callFrame.functionName || '(anonymous)');
    const location = sanitizeLocation(node.callFrame.url, node.callFrame.lineNumber, sanitizeRoot);
    const key = `${functionName}\u0000${location}`;
    const frame = aggregated.get(key) ?? {
      functionName,
      location,
      selfTimeMs: 0,
      selfPercent: 0,
      callers: [],
      heaviestUs: 0,
    };
    frame.selfTimeMs += us / 1000;
    if (us > frame.heaviestUs) {
      frame.heaviestUs = us;
      frame.callers = callersOf(nodeId);
    }
    aggregated.set(key, frame);
  }

  const frames = [...aggregated.values()]
    .sort((a, b) => b.selfTimeMs - a.selfTimeMs)
    .slice(0, maxFrames)
    .map(({ heaviestUs, ...frame }) => ({
      ...frame,
      selfTimeMs: round(frame.selfTimeMs),
      selfPercent: round(((frame.selfTimeMs * 1000) / jsUs) * 100),
    }));

  return {
    verdict: 'profiled',
    reason: `JS samples cover ${Math.round(coverage * 100)}% of the profiled ${Math.round(
      profiledUs / 1000
    )}ms of the block`,
    frames,
    gcPercent: round((gcUs / jsUs) * 100),
  };
};
