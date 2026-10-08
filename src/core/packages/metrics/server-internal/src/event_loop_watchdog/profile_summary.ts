/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { sanitize } from './sanitize';

/** V8's CPU profile, as serialised to `.cpuprofile` JSON (Chrome DevTools, speedscope). */
export interface CpuProfile {
  nodes: CpuProfileNode[];
  /** Microseconds on V8's monotonic clock. */
  startTime: number;
  endTime: number;
  /** Node id of each sample's leaf frame. */
  samples: number[];
  /** Microseconds since the previous sample (the first: since `startTime`). */
  timeDeltas: number[];
}

export interface CpuProfileNode {
  id: number;
  callFrame: {
    functionName: string;
    url: string;
    /** 0-based; -1 when unknown. */
    lineNumber: number;
    columnNumber: number;
    scriptId?: number | string;
  };
  hitCount?: number;
  children?: number[];
}

export interface FrameSummary {
  name: string;
  location?: string;
  /** Samples with this frame on top of the stack (self time). */
  samples: number;
  percent: number;
  /** Innermost callers of the frame's heaviest stack. */
  callers: string[];
}

export interface ProfileSummary {
  /** `blocks` when samples fell within the blocks; else the whole window is summarised. */
  scope: 'blocks' | 'window';
  samples: number;
  /** Busy (non-idle) samples in the window. */
  windowSamples: number;
  frames: FrameSummary[];
}

/** Microsecond ranges on the profile's clock, inclusive. */
export type TimeRange = readonly [number, number];

const MAX_FRAMES = 5;
const MAX_CALLERS = 3;
const IDLE = '(idle)';
const SKIPPED_FRAMES = new Set(['(program)', IDLE, '(root)']);
/** Stands in for samples trimmed between blocks, so that timelines do not stretch a frame over it. */
export const TRIMMED_FRAME = '(trimmed)';

/** Returns a repo-relative path, a `node:` specifier, or a basename. */
export const sanitizeLocation = (file: string, line: number, root: string): string | undefined => {
  if (!file) return undefined;
  let path = file.replace(/^file:\/\//, '').replace(/[?#].*$/, '');
  const normalizedRoot = root.endsWith('/') ? root : `${root}/`;
  if (path.startsWith(normalizedRoot)) {
    path = path.slice(normalizedRoot.length);
  } else if (!path.startsWith('node:')) {
    path = path.slice(path.lastIndexOf('/') + 1);
  }
  return sanitize(line > 0 ? `${path}:${line}` : path);
};

const percentOf = (part: number, total: number) =>
  total === 0 ? 0 : Math.round((part / total) * 1000) / 10;

/** Timestamp of each sample, on the profile's clock. */
export const sampleTimestamps = ({ startTime, timeDeltas }: CpuProfile): number[] => {
  let at = startTime;
  return timeDeltas.map((delta) => (at += delta));
};

const inAnyRange = (at: number, ranges: readonly TimeRange[], marginUs = 0) =>
  ranges.some(([start, end]) => at >= start - marginUs && at <= end + marginUs);

/** Summarises the samples of a kept window, focusing on those taken during `blocks`. */
export const summarizeProfile = (
  profile: CpuProfile,
  blocks: readonly TimeRange[],
  sanitizeRoot: string
): ProfileSummary => {
  const nodes = new Map(profile.nodes.map((node) => [node.id, node]));
  const parents = new Map<number, number>();
  for (const { id, children = [] } of profile.nodes)
    for (const child of children) parents.set(child, id);
  const frameOf = (id: number) => {
    const { functionName, url, lineNumber } = nodes.get(id)?.callFrame ?? {
      functionName: '',
      url: '',
      lineNumber: -1,
    };
    const name = sanitize(functionName || '(anonymous)');
    const location = sanitizeLocation(url, lineNumber + 1, sanitizeRoot);
    return { name, location, label: location ? `${name} (${location})` : name };
  };
  // Leaf-first frames of a node's stack, without V8's pseudo frames.
  const stacks = new Map<number, Array<ReturnType<typeof frameOf>>>();
  const stackOf = (leaf: number) => {
    let stack = stacks.get(leaf);
    if (!stack) {
      stack = [];
      for (let id: number | undefined = leaf; id !== undefined; id = parents.get(id)) {
        const frame = frameOf(id);
        if (!SKIPPED_FRAMES.has(frame.name)) stack.push(frame);
      }
      stacks.set(leaf, stack);
    }
    return stack;
  };

  const timestamps = sampleTimestamps(profile);
  const busy = profile.samples
    .map((leaf, index) => ({ leaf, at: timestamps[index] }))
    .filter(({ leaf }) => nodes.get(leaf)?.callFrame.functionName !== IDLE);
  const inBlocks = busy.filter(({ at }) => inAnyRange(at, blocks));
  const scope = inBlocks.length > 0 ? 'blocks' : 'window';
  const selected = scope === 'blocks' ? inBlocks : busy;

  const frames = new Map<string, FrameSummary & { leaves: Map<number, number> }>();
  for (const { leaf } of selected) {
    const [top] = stackOf(leaf);
    if (!top) continue;
    const frame = frames.get(top.label) ?? {
      name: top.name,
      location: top.location,
      samples: 0,
      percent: 0,
      callers: [],
      leaves: new Map<number, number>(),
    };
    frame.samples++;
    frame.leaves.set(leaf, (frame.leaves.get(leaf) ?? 0) + 1);
    frames.set(top.label, frame);
  }

  return {
    scope,
    samples: selected.length,
    windowSamples: busy.length,
    frames: [...frames.values()]
      .sort((a, b) => b.samples - a.samples)
      .slice(0, MAX_FRAMES)
      .map(({ leaves, ...frame }) => {
        const [heaviest] = [...leaves].sort((a, b) => b[1] - a[1])[0];
        return {
          ...frame,
          percent: percentOf(frame.samples, selected.length),
          callers: stackOf(heaviest)
            .slice(1, MAX_CALLERS + 1)
            .map(({ label }) => label),
        };
      }),
  };
};

/**
 * Keeps only the samples within `marginUs` of `blocks` (as context), with the nodes they reference,
 * and narrows the profile's time span accordingly. Where samples between blocks are dropped, a
 * `(trimmed)` sample marks the gap so that timeline views do not stretch the last frame over it.
 */
export const trimToBlocks = (
  profile: CpuProfile,
  blocks: readonly TimeRange[],
  marginUs: number
): CpuProfile => {
  const timestamps = sampleTimestamps(profile);
  const kept: Array<{ leaf: number; at: number }> = [];
  let trimmedId: number | undefined;
  let previous = -1;
  profile.samples.forEach((leaf, index) => {
    const at = timestamps[index];
    if (!inAnyRange(at, blocks, marginUs)) return;
    if (previous !== -1 && previous !== index - 1) {
      trimmedId ??= Math.max(...profile.nodes.map(({ id }) => id)) + 1;
      kept.push({ leaf: trimmedId, at: timestamps[previous + 1] });
    }
    kept.push({ leaf, at });
    previous = index;
  });
  if (kept.length === 0) return profile;

  const root = profile.nodes[0];
  const nodes = new Map(profile.nodes.map((node) => [node.id, node]));
  const parents = new Map<number, number>();
  for (const { id, children = [] } of profile.nodes)
    for (const child of children) parents.set(child, id);
  if (trimmedId !== undefined) {
    nodes.set(trimmedId, {
      id: trimmedId,
      callFrame: { functionName: TRIMMED_FRAME, url: '', lineNumber: -1, columnNumber: -1 },
    });
    parents.set(trimmedId, root.id);
  }
  const hits = new Map<number, number>();
  const used = new Set<number>();
  for (const { leaf } of kept) {
    hits.set(leaf, (hits.get(leaf) ?? 0) + 1);
    for (
      let id: number | undefined = leaf;
      id !== undefined && !used.has(id);
      id = parents.get(id)
    ) {
      used.add(id);
    }
  }
  const children = new Map<number, number[]>();
  for (const id of used) {
    const parent = parents.get(id);
    if (parent !== undefined) children.set(parent, [...(children.get(parent) ?? []), id]);
  }

  const firstAt = kept[0].at;
  const lastAt = kept[kept.length - 1].at;
  const startTime = Math.min(
    firstAt,
    Math.max(profile.startTime, Math.min(...blocks.map(([start]) => start - marginUs)))
  );
  const endTime = Math.max(
    lastAt,
    Math.min(profile.endTime, Math.max(...blocks.map(([, end]) => end + marginUs)))
  );
  return {
    // Line-level `positionTicks` are dropped: they would not match the trimmed samples.
    nodes: [...nodes.values()]
      .filter(({ id }) => used.has(id))
      .map(({ id, callFrame }) => ({
        id,
        callFrame,
        hitCount: hits.get(id) ?? 0,
        ...(children.has(id) && { children: children.get(id) }),
      })),
    startTime,
    endTime,
    samples: kept.map(({ leaf }) => leaf),
    timeDeltas: kept.map(({ at }, index) => at - (index === 0 ? startTime : kept[index - 1].at)),
  };
};

/** Where a kept profile went: a written file, or why it was not written. */
export type ProfileOutcome = { file: string } | { notWritten: string };

/** Single-line, human-readable form of a kept profile. */
export const formatSummary = (
  summary: ProfileSummary,
  blockedMs: readonly number[],
  kept: number,
  outcome: ProfileOutcome
): string => {
  const blocks = blockedMs.map((ms) => `~${Math.round(ms)}ms`).join(', ') || 'none recorded';
  const samples =
    summary.scope === 'blocks'
      ? `${summary.samples}/${summary.windowSamples} samples in blocks`
      : `no samples in blocks, ${summary.windowSamples} in window`;
  const frames = summary.frames
    .slice(0, 3)
    .map(({ percent, name, location, callers }) =>
      [`${percent}% ${name}${location ? ` (${location})` : ''}`, ...callers].join(' <- ')
    )
    .join('; ');
  const output =
    'file' in outcome ? `File: ${outcome.file}` : `Not written: ${outcome.notWritten}.`;
  return `Event loop block profile #${kept}: blocks [${blocks}], ${samples}. Top: ${
    frames || 'none'
  }. ${output}`;
};
