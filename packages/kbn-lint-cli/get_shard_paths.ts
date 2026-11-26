/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';

/**
 * Splits repo-relative files into at most `shardCount` lists of directories and files with roughly
 * equal file counts, so each list can go to a separate linter process without hitting ARG_MAX.
 */
export const getShardPaths = (files: readonly string[], shardCount: number): string[][] => {
  const fileCounts = new Map<string, number>();
  const children = new Map<string, Set<string>>();
  for (const file of files) {
    let child = file;
    let dir = Path.dirname(file);
    while (true) {
      fileCounts.set(child, (fileCounts.get(child) ?? 0) + 1);
      const siblings = children.get(dir) ?? new Set<string>();
      siblings.add(child);
      children.set(dir, siblings);
      if (dir === '.') {
        break;
      }
      child = dir;
      dir = Path.dirname(dir);
    }
  }
  const countOf = (path: string) => fileCounts.get(path) ?? 0;

  // Split directories until no unit exceeds a fraction of a shard, then hand out the largest
  // units first, each to the currently lightest shard.
  const maxUnitSize = files.length / (shardCount * 8);
  const units: string[] = [];
  const pending = [...(children.get('.') ?? [])];
  for (let unit = pending.pop(); unit !== undefined; unit = pending.pop()) {
    const unitChildren = children.get(unit);
    if (unitChildren && countOf(unit) > maxUnitSize) {
      pending.push(...unitChildren);
    } else {
      units.push(unit);
    }
  }
  units.sort((a, b) => countOf(b) - countOf(a));

  const shards = Array.from({ length: shardCount }, () => ({
    fileCount: 0,
    paths: [] as string[],
  }));
  for (const unit of units) {
    const lightest = shards.reduce((min, shard) => (shard.fileCount < min.fileCount ? shard : min));
    lightest.fileCount += countOf(unit);
    lightest.paths.push(unit);
  }
  return shards.flatMap(({ paths }) => (paths.length > 0 ? [paths] : []));
};
