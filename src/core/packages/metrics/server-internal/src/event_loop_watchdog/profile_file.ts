/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Os from 'node:os';
import type { CpuProfile } from './profile_capture';
import { IDLE, isKibanaPath } from './profile_summary';
import { relativeLocation } from './sanitize';
import type { Phase } from './types';

const BLOCKED_MS_DIGITS = 6;
const NODE_MODULES = 'node_modules/';

/**
 * Puts the phase and zero-padded block duration first so filenames group by phase and sort by
 * duration.
 */
export const fileName = (phase: Phase, blockedMs: number, date: Date): string => {
  const duration = String(Math.round(blockedMs)).padStart(BLOCKED_MS_DIGITS, '0');
  const time = date.toISOString().replace(/[:.]/g, '-');
  return `event-loop-block-${phase}-${duration}ms-${time}-${Os.hostname()}-${
    process.pid
  }.cpuprofile`;
};

// Make Kibana frames visible in DevTools by using repo-relative paths and
// removing the ignored `node_modules/` prefix.
const fileUrl = (url: string | undefined, root: string): string | undefined => {
  const rel = url && relativeLocation(url, root);
  if (!rel || !isKibanaPath(rel)) return url;
  return rel.startsWith(NODE_MODULES) ? rel.slice(NODE_MODULES.length) : rel;
};

/**
 * Trims the pre-sample lead-in and idle tail, removes nodes outside sampled call stacks, and
 * rewrites Kibana frame URLs for DevTools. Mutates kept nodes in place to avoid duplicating a
 * large profile in the worker heap.
 */
export const prepareProfile = (profile: CpuProfile, root: string): CpuProfile => {
  const { nodes, samples = [], timeDeltas = [] } = profile;
  const byId = new Map(nodes.map((node) => [node.id, node]));
  let kept = samples.length;
  while (kept > 0 && byId.get(samples[kept - 1])?.callFrame.functionName === IDLE) {
    kept--;
  }
  const keptSamples = samples.slice(0, kept);
  const keptDeltas = timeDeltas.slice(0, kept).map((delta, i) => (i === 0 ? 0 : delta));
  const startTime = profile.startTime + (timeDeltas[0] ?? 0);
  const endTime = keptDeltas.reduce((time, delta) => time + delta, startTime);

  const hits = new Map<number, number>();
  for (const id of keptSamples) {
    hits.set(id, (hits.get(id) ?? 0) + 1);
  }
  const parents = new Map<number, number>();
  for (const { id, children = [] } of nodes) {
    for (const child of children) {
      parents.set(child, id);
    }
  }
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
