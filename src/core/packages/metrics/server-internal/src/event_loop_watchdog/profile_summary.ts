/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { capLocation, capName, relativeLocation } from './sanitize';

interface CallFrame {
  functionName: string;
  url?: string;
  /** 0-based; -1 when unknown. */
  lineNumber?: number;
}

/** The parts of a V8 CPU profile (`Profiler.Profile`) `summarizeProfile` reads. */
export interface SummarizableProfile {
  nodes: ReadonlyArray<{
    id: number;
    callFrame: CallFrame;
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
  /** Nearest Kibana callers: the most common pair among the call frame's samples. */
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

interface Counted<T> {
  value: T;
  count: number;
}

const bump = <T>(counts: Map<string, Counted<T>>, key: string, value: T): void => {
  const entry = counts.get(key);
  if (entry) {
    entry.count++;
  } else {
    counts.set(key, { value, count: 1 });
  }
};

const isKibanaPath = (rel: string | undefined): boolean =>
  rel !== undefined &&
  (rel.startsWith('src/') || rel.startsWith('x-pack/') || rel.startsWith('node_modules/@kbn/'));

const percentOf = (part: number, total: number): number =>
  total === 0 ? 0 : Math.round((part / total) * 1000) / 10;

const compareStrings = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** Most samples first; ties broken by location, then name, so the order is stable. */
const compareFrames = (a: Counted<CallerSummary>, b: Counted<CallerSummary>): number =>
  b.count - a.count ||
  compareStrings(a.value.location ?? '', b.value.location ?? '') ||
  compareStrings(a.value.name, b.value.name);

const top = (counts: Map<string, Counted<CallerSummary>>, limit: number) =>
  [...counts.entries()].sort(([, a], [, b]) => compareFrames(a, b)).slice(0, limit);

const cap = ({ name, location }: CallerSummary): CallerSummary =>
  location === undefined
    ? { name: capName(name) }
    : { name: capName(name), location: capLocation(location) };

/** Summarises a block's CPU profile: busy call frames, and the Kibana code they were reached from. */
export const summarizeProfile = (
  { nodes, samples = [], timeDeltas = [], startTime }: SummarizableProfile,
  { root, inBlockUntilUs }: SummarizeProfileOptions
): ProfileSummary => {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const parentById = new Map<number, number>();
  for (const { id, children = [] } of nodes) {
    for (const child of children) {
      parentById.set(child, id);
    }
  }

  const keyOf = ({ functionName, url = '', lineNumber = -1 }: CallFrame): string =>
    `${functionName}\u0000${url}\u0000${lineNumber}`;

  const describe = ({ functionName, url = '', lineNumber = -1 }: CallFrame): CallerSummary => {
    const name = functionName || '(anonymous)';
    const path = relativeLocation(url, root);
    if (path === undefined) {
      return { name };
    }
    return { name, location: lineNumber >= 0 ? `${path}:${lineNumber + 1}` : path };
  };

  // Matched on the full repo-relative path: a capped location can lose its `src/` prefix.
  const kibanaByUrl = new Map<string, boolean>();
  const isKibana = ({ functionName, url = '' }: CallFrame): boolean => {
    if (NOT_A_FRAME.has(functionName)) {
      return false;
    }
    let kibana = kibanaByUrl.get(url);
    if (kibana === undefined) {
      kibana = isKibanaPath(relativeLocation(url, root));
      kibanaByUrl.set(url, kibana);
    }
    return kibana;
  };

  const selfCounts = new Map<string, Counted<CallerSummary>>();
  const kibanaCounts = new Map<string, Counted<CallerSummary>>();
  // Per Kibana call frame: samples counted by the callers that get printed.
  const callerCounts = new Map<string, Map<string, Counted<CallFrame[]>>>();
  let busy = 0;
  let t = startTime;
  for (let s = 0; s < samples.length; s++) {
    t += timeDeltas[s] ?? 0;
    // Samples are in time order, so the first one after the block's end ends the block.
    if (inBlockUntilUs !== undefined && t > inBlockUntilUs) {
      break;
    }
    const leaf = nodeById.get(samples[s]);
    if (!leaf || leaf.callFrame.functionName === IDLE) {
      continue;
    }
    busy++;
    if (!NOT_A_FRAME.has(leaf.callFrame.functionName)) {
      bump(selfCounts, keyOf(leaf.callFrame), describe(leaf.callFrame));
    }

    // Walk up the stack: the nearest Kibana call frame, then up to MAX_CALLERS Kibana callers.
    const kibanaStack: CallFrame[] = [];
    for (
      let id: number | undefined = leaf.id;
      id !== undefined && kibanaStack.length <= MAX_CALLERS;
      id = parentById.get(id)
    ) {
      const callFrame = nodeById.get(id)?.callFrame;
      if (callFrame && isKibana(callFrame)) {
        kibanaStack.push(callFrame);
      }
    }
    const [frame, ...callers] = kibanaStack;
    if (!frame) {
      continue;
    }
    const frameKey = keyOf(frame);
    bump(kibanaCounts, frameKey, describe(frame));
    let byCallers = callerCounts.get(frameKey);
    if (!byCallers) {
      byCallers = new Map();
      callerCounts.set(frameKey, byCallers);
    }
    bump(byCallers, callers.map(keyOf).join('\u0001'), callers);
  }

  const frames: FrameSummary[] = top(selfCounts, MAX_FRAMES).map(([, { value, count }]) => ({
    ...cap(value),
    percent: percentOf(count, busy),
  }));

  const kibanaFrames: KibanaFrameSummary[] = top(kibanaCounts, MAX_KIBANA_FRAMES).map(
    ([frameKey, { value, count }]) => {
      let mostCommon: Counted<CallFrame[]> | undefined;
      for (const entry of callerCounts.get(frameKey)?.values() ?? []) {
        if (!mostCommon || entry.count > mostCommon.count) {
          mostCommon = entry;
        }
      }
      return {
        ...cap(value),
        percent: percentOf(count, busy),
        callers: (mostCommon?.value ?? []).map((caller) => cap(describe(caller))),
      };
    }
  );

  const [first] = kibanaFrames;
  return {
    samples: busy,
    frames,
    kibanaFrames,
    ...(first
      ? {
          topKibanaFrame: {
            ...(first.location !== undefined ? { location: first.location } : {}),
            percent: first.percent,
          },
        }
      : {}),
  };
};
