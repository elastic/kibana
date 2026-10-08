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
  /** Samples attributed to this frame. */
  samples: number;
  percent: number;
  /** Innermost callers of the frame's heaviest stack. */
  callers: string[];
}

export interface ProfileSummary {
  /** Busy (non-idle) samples. */
  samples: number;
  /** Frames on top of the stack (self time). */
  frames: FrameSummary[];
  /** Nearest Kibana-owned frame of each sample: which Kibana code led to the busy frames. */
  kibanaFrames: FrameSummary[];
}

const MAX_FRAMES = 5;
const MAX_CALLERS = 3;
const IDLE = '(idle)';
const SKIPPED_FRAMES = new Set(['(program)', IDLE, '(root)']);
/** Kibana's own code: sources in development, `@kbn/` packages in the distributable. */
const KIBANA_LOCATION = /^(src\/|x-pack\/|node_modules\/@kbn\/)/;

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

interface Frame {
  name: string;
  location?: string;
  label: string;
}

const rank = (
  entries: Map<string, { frame: Frame; samples: number; stacks: Map<Frame[], number> }>,
  total: number
): FrameSummary[] =>
  [...entries.values()]
    .sort((a, b) => b.samples - a.samples)
    .slice(0, MAX_FRAMES)
    .map(({ frame, samples, stacks }) => {
      const [heaviest] = [...stacks].sort((a, b) => b[1] - a[1])[0];
      return {
        name: frame.name,
        location: frame.location,
        samples,
        percent: percentOf(samples, total),
        callers: heaviest.slice(0, MAX_CALLERS).map(({ label }) => label),
      };
    });

/** Summarises a block's profile: busy frames, and the Kibana code they were reached from. */
export const summarizeProfile = (profile: CpuProfile, sanitizeRoot: string): ProfileSummary => {
  const nodes = new Map(profile.nodes.map((node) => [node.id, node]));
  const parents = new Map<number, number>();
  for (const { id, children = [] } of profile.nodes) {
    for (const child of children) parents.set(child, id);
  }
  // Leaf-first frames of a node's stack, without V8's pseudo frames.
  const stacks = new Map<number, Frame[]>();
  const stackOf = (leaf: number): Frame[] => {
    let stack = stacks.get(leaf);
    if (!stack) {
      stack = [];
      for (let id: number | undefined = leaf; id !== undefined; id = parents.get(id)) {
        const { functionName = '', url = '', lineNumber = -1 } = nodes.get(id)?.callFrame ?? {};
        const name = sanitize(functionName || '(anonymous)');
        if (SKIPPED_FRAMES.has(name)) continue;
        const location = sanitizeLocation(url, lineNumber + 1, sanitizeRoot);
        stack.push({ name, location, label: location ? `${name} (${location})` : name });
      }
      stacks.set(leaf, stack);
    }
    return stack;
  };

  const busy = profile.samples.filter((leaf) => nodes.get(leaf)?.callFrame.functionName !== IDLE);
  const frames = new Map<string, { frame: Frame; samples: number; stacks: Map<Frame[], number> }>();
  const kibanaFrames = new Map<
    string,
    { frame: Frame; samples: number; stacks: Map<Frame[], number> }
  >();
  const count = (entries: typeof frames, frame: Frame, callers: Frame[]) => {
    const entry = entries.get(frame.label) ?? { frame, samples: 0, stacks: new Map() };
    entry.samples++;
    entry.stacks.set(callers, (entry.stacks.get(callers) ?? 0) + 1);
    entries.set(frame.label, entry);
  };
  const kibanaCallers = new Map<Frame[], { frame: Frame; callers: Frame[] } | undefined>();
  for (const leaf of busy) {
    const stack = stackOf(leaf);
    if (stack.length === 0) continue;
    count(frames, stack[0], stack.slice(1));
    if (!kibanaCallers.has(stack)) {
      const index = stack.findIndex(({ location }) => location && KIBANA_LOCATION.test(location));
      kibanaCallers.set(
        stack,
        index === -1
          ? undefined
          : {
              frame: stack[index],
              // only Kibana frames above it, for context
              callers: stack
                .slice(index + 1)
                .filter(({ location }) => location && KIBANA_LOCATION.test(location)),
            }
      );
    }
    const kibana = kibanaCallers.get(stack);
    if (kibana) count(kibanaFrames, kibana.frame, kibana.callers);
  }

  return {
    samples: busy.length,
    frames: rank(frames, busy.length),
    kibanaFrames: rank(kibanaFrames, busy.length),
  };
};

/** Where a profile went: a written file, or why it was not written. */
export type ProfileOutcome = { file: string } | { notWritten: string };

export interface ProfiledBlock {
  blockedMs: number;
  /** How long the block had lasted when profiling was requested. */
  profiledAfterMs: number;
  /** How long the main thread took to start the profiler (part of the block). */
  profilerStartMs?: number;
}

const describeFrames = (frames: readonly FrameSummary[]) =>
  frames
    .slice(0, 3)
    .map(({ percent, name, location, callers }) =>
      [`${percent}% ${name}${location ? ` (${location})` : ''}`, ...callers].join(' <- ')
    )
    .join('; ') || 'none';

/** Single-line, human-readable form of a block's profile. */
export const formatSummary = (
  summary: ProfileSummary,
  { blockedMs, profiledAfterMs, profilerStartMs }: ProfiledBlock,
  profiled: number,
  outcome: ProfileOutcome
): string => {
  const start =
    profilerStartMs === undefined ? '' : `, profiler start took ~${Math.round(profilerStartMs)}ms`;
  const output =
    'file' in outcome ? `File: ${outcome.file}` : `Not written: ${outcome.notWritten}.`;
  return `Event loop block profile #${profiled}: block ~${Math.round(
    blockedMs
  )}ms (profiled after ~${Math.round(profiledAfterMs)}ms${start}), ${
    summary.samples
  } samples. Top: ${describeFrames(summary.frames)}. Kibana code: ${describeFrames(
    summary.kibanaFrames
  )}. ${output}`;
};
