/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Session } from 'node:inspector/promises';
import { relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SAMPLING_INTERVAL_US } from './constants';

/** The parts of a V8 CPU profile (`Profiler.Profile`) the watchdog reads. */
export interface CpuProfile {
  nodes: readonly CpuProfileNode[];
  /** Microseconds; when profiling was requested, before the first sample. */
  startTime: number;
  endTime: number;
  samples?: readonly number[];
  /** Microseconds between samples; the first is measured from `startTime`. */
  timeDeltas?: readonly number[];
}

export interface CpuProfileNode {
  id: number;
  callFrame: {
    functionName: string;
    url?: string;
    /** 0-based; -1 when unknown. */
    lineNumber?: number;
  };
  children?: readonly number[];
  hitCount?: number;
}

/** The inspector session calls a capture makes; injectable for tests. */
export interface InspectorSession {
  connectToMainThread(): void;
  post(method: 'Profiler.stop'): Promise<{ profile: CpuProfile }>;
  post(method: string, params?: object): Promise<unknown>;
  disconnect(): void;
}

export const createInspectorSession = (): InspectorSession => new Session() as InspectorSession;

/**
 * One CPU profile of the main thread, taken from the worker. Inspector commands run on the main
 * thread through V8 interrupts, so the profile starts and stops while the main thread is blocked.
 */
export class ProfileCapture {
  private readonly session: InspectorSession;
  private disposed = false;

  constructor(createSession: () => InspectorSession) {
    this.session = createSession();
    this.session.connectToMainThread();
  }

  /** Starts the profiler; resolves once it's sampling. Posted together, so one round trip. */
  public async start(): Promise<void> {
    await Promise.all([
      this.session.post('Profiler.enable'),
      this.session.post('Profiler.setSamplingInterval', {
        interval: SAMPLING_INTERVAL_US,
      }),
      this.session.post('Profiler.start'),
    ]);
  }

  /** Stops the profiler and ends the session; resolves with the samples so far. */
  public async stop(): Promise<CpuProfile> {
    try {
      const { profile } = await this.session.post('Profiler.stop');
      return profile;
    } finally {
      this.dispose();
    }
  }

  /** Ends the session without waiting; this also stops a running profile. */
  public dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.session.disconnect();
  }
}

// Chrome DevTools' default ignore list (`/node_modules/|^node:`) would hide every Kibana frame.
const fileUrl = (url: string | undefined, root: string): string | undefined => {
  if (!url || url.startsWith('node:')) return url;
  const path = url.startsWith('file://') ? fileURLToPath(url) : url;
  const rel = relative(root, path).split(sep).join('/');
  if (rel.startsWith('node_modules/@kbn/')) return rel.slice('node_modules/'.length);
  return rel.startsWith('src/') || rel.startsWith('x-pack/') ? rel : url;
};

/**
 * Trims the cold-start lead-in and the idle tail, prunes unsampled nodes and rewrites Kibana URLs.
 * Changes the kept nodes in place: a copy doesn't fit in the worker's heap next to the original.
 */
export const prepareProfile = (profile: CpuProfile, root: string): CpuProfile => {
  const { nodes, samples = [], timeDeltas = [] } = profile;
  const byId = new Map(nodes.map((node) => [node.id, node]));
  let kept = samples.length;
  while (kept > 0 && byId.get(samples[kept - 1])?.callFrame.functionName === '(idle)') kept--;
  const keptSamples = samples.slice(0, kept);
  const keptDeltas = timeDeltas.slice(0, kept).map((delta, i) => (i === 0 ? 0 : delta));
  const startTime = profile.startTime + (timeDeltas[0] ?? 0);
  const endTime = keptDeltas.reduce((time, delta) => time + delta, startTime);

  const hits = new Map<number, number>();
  for (const id of keptSamples) hits.set(id, (hits.get(id) ?? 0) + 1);
  const parents = new Map<number, number>();
  for (const { id, children = [] } of nodes) for (const child of children) parents.set(child, id);
  const keep = new Set<number>();
  for (const sampled of hits.keys()) {
    let id: number | undefined = sampled;
    while (id !== undefined && !keep.has(id)) {
      keep.add(id);
      id = parents.get(id);
    }
  }

  return {
    ...profile,
    nodes: nodes
      .filter(({ id }) => keep.has(id))
      .map((node) => {
        node.callFrame.url = fileUrl(node.callFrame.url, root);
        node.hitCount = hits.get(node.id) ?? 0;
        node.children = node.children?.filter((child) => keep.has(child));
        return node;
      }),
    startTime,
    endTime,
    samples: keptSamples,
    timeDeltas: keptDeltas,
  };
};
