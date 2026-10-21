/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** Pure helpers for the 2 GiB cap sweep. No I/O. */

const KERNEL_PARTS = ['kernel_stack', 'slab', 'sock', 'pagetables', 'percpu'];

/** Parse cgroup v2 memory.stat text into numeric fields. */
export const parseMemoryStat = (text) => {
  const stat = {};
  for (const line of String(text).split('\n')) {
    const [key, raw] = line.trim().split(/\s+/);
    if (!key || !/^\d+$/.test(raw ?? '')) continue;
    stat[key] = Number(raw);
  }
  return stat;
};

/** Prefer the aggregate `kernel` field when the kernel provides it. */
export const kernelBytes = (stat) => {
  if (typeof stat.kernel === 'number') return stat.kernel;
  return KERNEL_PARTS.reduce((sum, key) => sum + (stat[key] ?? 0), 0);
};

/**
 * Working set is memory.current minus inactive_file.
 * Inactive file cache is reclaimable before the OOM killer runs.
 */
export const accountCgroup = (current, stat) => {
  const inactiveFile = stat.inactive_file ?? 0;
  return {
    current,
    anon: stat.anon ?? null,
    file: stat.file ?? null,
    shmem: stat.shmem ?? null,
    kernel: kernelBytes(stat),
    inactiveFile,
    workingSet: current - inactiveFile,
  };
};

export const deltaAccount = (after, before) => {
  const keys = ['current', 'anon', 'file', 'shmem', 'kernel', 'inactiveFile', 'workingSet'];
  const delta = {};
  for (const key of keys) {
    delta[key] = after?.[key] == null || before?.[key] == null ? null : after[key] - before[key];
  }
  return delta;
};

/**
 * Lowest old-space cap that survived. Default young generation wins over 32
 * at the same old-space cap. The uncapped inherit cell is never a winner.
 */
export const winningCap = (cells) => {
  const survived = (cells ?? []).filter((cell) => cell.survived && cell.old !== 'inherit');
  for (const old of [256, 384, 512]) {
    if (survived.some((cell) => cell.old === old && cell.young === 'default')) {
      return { old, young: 'default' };
    }
    if (survived.some((cell) => cell.old === old && cell.young === 32)) {
      return { old, young: 32 };
    }
  }
  return null;
};
