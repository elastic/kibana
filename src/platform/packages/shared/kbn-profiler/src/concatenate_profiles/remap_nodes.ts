/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CpuProfile, CpuProfileNode } from './types';

let nextId = 1;

export function resetRemapState() {
  nextId = 1;
}

/**
 * Remap node IDs from source profile into target profile, updating children/parent references
 * and appending nodes + samples.
 */
export function remapNodesSequential({
  source,
  target,
}: {
  source: CpuProfile;
  target: CpuProfile;
}) {
  const idMap = new Map<number, number>();
  for (const node of source.nodes) {
    idMap.set(node.id, nextId++);
  }

  for (const node of source.nodes) {
    const remapped: CpuProfileNode = { ...node, id: idMap.get(node.id)! };
    if (Array.isArray(node.children)) {
      remapped.children = node.children
        .map((cid) => idMap.get(cid))
        .filter((v): v is number => typeof v === 'number');
    }
    if (typeof remapped.parent === 'number') {
      const mappedParent = idMap.get(remapped.parent);
      if (mappedParent === undefined) delete remapped.parent;
      else remapped.parent = mappedParent;
    }
    target.nodes.push(remapped);
  }

  for (const sample of source.samples) {
    const remappedSample = idMap.get(sample);
    if (remappedSample !== undefined) target.samples.push(remappedSample);
  }
}
