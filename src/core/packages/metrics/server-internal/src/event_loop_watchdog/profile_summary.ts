/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { MAX_NAME_BYTES, relativeLocation, sanitize, sanitizeLocation } from './sanitize';

/** The parts of a V8 CPU profile (`Profiler.Profile`) `summarizeProfile` reads. */
export interface SummarizableProfile {
  nodes: ReadonlyArray<{
    id: number;
    callFrame: {
      functionName: string;
      url?: string;
      /** 0-based; -1 when unknown. */
      lineNumber?: number;
    };
    children?: readonly number[];
  }>;
  /** Microseconds on the profile's monotonic clock. */
  startTime: number;
  endTime: number;
  samples?: readonly number[];
  /** Microseconds between samples; the first is measured from `startTime`. */
  timeDeltas?: readonly number[];
}

export interface CallerSummary {
  name: string;
  location?: string;
}

export interface FrameSummary {
  name: string;
  location?: string;
  percent: number;
}

export interface KibanaFrameSummary extends FrameSummary {
  /** Innermost Kibana callers of the call frame's heaviest caller chain. */
  callers: CallerSummary[];
}

export interface TopKibanaFrame {
  location?: string;
  percent: number;
}

export interface ProfileSummary {
  /** Busy (non-idle) samples within the block. */
  samples: number;
  /** Top call frames on top of the stack (self time), any code. */
  frames: FrameSummary[];
  /** Nearest Kibana call frame of each sample, with its Kibana callers. */
  kibanaFrames: KibanaFrameSummary[];
  /** Scalar copy of `kibanaFrames[0]` for fleet-wide ES|QL aggregation. */
  topKibanaFrame?: TopKibanaFrame;
}

export interface SummarizeProfileOptions {
  /** Repo root path, used to turn `file://` URLs into repo-relative locations. */
  root: string;
  /** Block end on the profile's clock (µs); samples after it are left out. */
  inBlockUntilUs?: number;
}

const MAX_FRAMES = 2;
const MAX_KIBANA_FRAMES = 3;
const MAX_CALLERS = 2;
const IDLE = '(idle)';
const NOT_A_FRAME = new Set(['(program)', IDLE, '(root)']);
const CHAIN_KEY_STRIDE = 16_777_216;

const isKibanaPath = (rel: string | undefined): boolean =>
  rel !== undefined &&
  (rel.startsWith('src/') || rel.startsWith('x-pack/') || rel.startsWith('node_modules/@kbn/'));

const rawLocation = (url: string, lineNumber: number, root: string): string => {
  const rel = relativeLocation(url, root);
  if (rel === undefined) {
    return '';
  }
  return lineNumber >= 0 ? `${rel}:${lineNumber + 1}` : rel;
};

const percentOf = (part: number, total: number): number =>
  total === 0 ? 0 : Math.round((part / total) * 1000) / 10;

/**
 * Summarises a block's CPU profile: busy call frames, and the Kibana code they were reached from.
 * Memory follows node count: one record per distinct `callFrame`, per-node links in `Int32Array`s,
 * Kibana caller chains interned as `(frame, parentChain)` pairs, and sanitised strings built only
 * for the call frames in the output.
 */
export const summarizeProfile = (
  profile: SummarizableProfile,
  { root, inBlockUntilUs }: SummarizeProfileOptions
): ProfileSummary => {
  const { nodes, samples = [], timeDeltas = [], startTime } = profile;
  const n = nodes.length;

  let maxId = 0;
  for (let i = 0; i < n; i++) {
    if (nodes[i].id > maxId) {
      maxId = nodes[i].id;
    }
  }
  const indexOfId = new Int32Array(maxId + 1).fill(-1);
  for (let i = 0; i < n; i++) {
    indexOfId[nodes[i].id] = i;
  }

  const parent = new Int32Array(n).fill(-1);
  for (let i = 0; i < n; i++) {
    const { children } = nodes[i];
    if (children) {
      for (const childId of children) {
        const childIndex = indexOfId[childId];
        if (childIndex !== undefined && childIndex >= 0) {
          parent[childIndex] = i;
        }
      }
    }
  }

  // Distinct call frames. -1 = not a call frame ((program), (idle), (root)).
  const frameOf = new Int32Array(n);
  const frameKey = new Map<string, number>();
  const frameNode: number[] = [];
  const frameIsKibana: boolean[] = [];
  const kibanaByUrl = new Map<string, boolean>();
  for (let i = 0; i < n; i++) {
    const { functionName, url = '', lineNumber = -1 } = nodes[i].callFrame;
    if (NOT_A_FRAME.has(functionName)) {
      frameOf[i] = -1;
      continue;
    }
    const key = `${lineNumber}\u0000${functionName}\u0000${url}`;
    let f = frameKey.get(key);
    if (f === undefined) {
      f = frameNode.length;
      frameKey.set(key, f);
      frameNode.push(i);
      let isKibana = kibanaByUrl.get(url);
      if (isKibana === undefined) {
        // Match on the repo-relative path before the location length limit: locations keep their
        // end, so a cut location would lose its `src/` / `x-pack/` / `node_modules/@kbn/` prefix.
        isKibana = isKibanaPath(relativeLocation(url, root));
        kibanaByUrl.set(url, isKibana);
      }
      frameIsKibana.push(isKibana);
    }
    frameOf[i] = f;
  }
  frameKey.clear();
  kibanaByUrl.clear();

  // Nearest Kibana node (self or ancestor), and the interned Kibana caller chain above it.
  const nearestKibana = new Int32Array(n).fill(-2); // -2 = not computed, -1 = none
  const chainOfNode = new Int32Array(n).fill(-1);
  const chainFrame: number[] = [];
  const chainParent: number[] = [];
  const chainIntern = new Map<number, number>();
  const internChain = (frame: number, parentChain: number): number => {
    const key = frame * CHAIN_KEY_STRIDE + (parentChain + 1);
    let id = chainIntern.get(key);
    if (id === undefined) {
      id = chainFrame.length;
      chainFrame.push(frame);
      chainParent.push(parentChain);
      chainIntern.set(key, id);
    }
    return id;
  };
  const pending: number[] = [];
  const resolve = (start: number) => {
    for (let i = start; i !== -1 && nearestKibana[i] === -2; i = parent[i]) {
      pending.push(i);
    }
    while (pending.length > 0) {
      const i = pending.pop()!;
      const p = parent[i];
      const above = p === -1 ? -1 : nearestKibana[p];
      const f = frameOf[i];
      if (f !== -1 && frameIsKibana[f]) {
        nearestKibana[i] = i;
        chainOfNode[i] = above === -1 ? -1 : internChain(frameOf[above], chainOfNode[above]);
      } else {
        nearestKibana[i] = above;
      }
    }
  };
  for (let i = 0; i < n; i++) {
    resolve(i);
  }
  chainIntern.clear();

  const selfCount = new Int32Array(frameNode.length);
  const kibanaCount = new Int32Array(frameNode.length);
  const byCallers = new Map<number, number>();
  let busy = 0;
  let t = startTime;
  for (let s = 0; s < samples.length; s++) {
    t += timeDeltas[s] ?? 0;
    if (inBlockUntilUs !== undefined && t > inBlockUntilUs) {
      break;
    }
    const i = indexOfId[samples[s]];
    if (i === undefined || i < 0 || nodes[i].callFrame.functionName === IDLE) {
      continue;
    }
    busy++;
    const f = frameOf[i];
    if (f !== -1) {
      selfCount[f]++;
    }
    const k = nearestKibana[i];
    if (k !== -1) {
      const kf = frameOf[k];
      kibanaCount[kf]++;
      const key = kf * CHAIN_KEY_STRIDE + (chainOfNode[k] + 1);
      byCallers.set(key, (byCallers.get(key) ?? 0) + 1);
    }
  }

  const describe = (f: number): CallerSummary => {
    const { functionName, url = '', lineNumber = -1 } = nodes[frameNode[f]].callFrame;
    const name = sanitize(functionName || '(anonymous)', {
      maxBytes: MAX_NAME_BYTES,
      keep: 'start',
    });
    const location = sanitizeLocation(url, lineNumber, root);
    return location !== undefined ? { name, location } : { name };
  };

  const compareFrames = (counts: Int32Array, a: number, b: number): number => {
    const diff = counts[b] - counts[a];
    if (diff !== 0) {
      return diff;
    }
    const frameA = nodes[frameNode[a]].callFrame;
    const frameB = nodes[frameNode[b]].callFrame;
    const locA = rawLocation(frameA.url ?? '', frameA.lineNumber ?? -1, root);
    const locB = rawLocation(frameB.url ?? '', frameB.lineNumber ?? -1, root);
    if (locA !== locB) {
      return locA < locB ? -1 : 1;
    }
    const nameA = frameA.functionName || '(anonymous)';
    const nameB = frameB.functionName || '(anonymous)';
    return nameA < nameB ? -1 : nameA > nameB ? 1 : 0;
  };

  const top = (counts: Int32Array, limit: number): number[] => {
    const out: number[] = [];
    for (let f = 0; f < counts.length; f++) {
      if (counts[f] === 0) {
        continue;
      }
      out.push(f);
      out.sort((a, b) => compareFrames(counts, a, b));
      if (out.length > limit) {
        out.pop();
      }
    }
    return out;
  };

  const heaviestChain = new Map<number, [chain: number, samples: number]>();
  for (const [key, count] of byCallers) {
    const kf = Math.floor(key / CHAIN_KEY_STRIDE);
    const chain = (key % CHAIN_KEY_STRIDE) - 1;
    const best = heaviestChain.get(kf);
    if (!best || count > best[1]) {
      heaviestChain.set(kf, [chain, count]);
    }
  }

  const frames: FrameSummary[] = top(selfCount, MAX_FRAMES).map((f) => ({
    ...describe(f),
    percent: percentOf(selfCount[f], busy),
  }));

  const kibanaFrames: KibanaFrameSummary[] = top(kibanaCount, MAX_KIBANA_FRAMES).map((f) => {
    const callers: CallerSummary[] = [];
    for (
      let c = heaviestChain.get(f)?.[0] ?? -1;
      c !== -1 && callers.length < MAX_CALLERS;
      c = chainParent[c]
    ) {
      callers.push(describe(chainFrame[c]));
    }
    return {
      ...describe(f),
      percent: percentOf(kibanaCount[f], busy),
      callers,
    };
  });

  const [firstKibana] = kibanaFrames;
  return {
    samples: busy,
    frames,
    kibanaFrames,
    ...(firstKibana
      ? {
          topKibanaFrame: {
            ...(firstKibana.location !== undefined ? { location: firstKibana.location } : {}),
            percent: firstKibana.percent,
          },
        }
      : {}),
  };
};
