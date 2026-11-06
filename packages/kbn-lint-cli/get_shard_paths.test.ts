/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getShardPaths } from './get_shard_paths';

const isUnder = (file: string, path: string) => file === path || file.startsWith(`${path}/`);

describe('getShardPaths', () => {
  const files = [
    'root.js',
    ...Array.from({ length: 40 }, (_, i) => `src/big/nested/file_${i}.ts`),
    ...Array.from({ length: 10 }, (_, i) => `src/big/file_${i}.ts`),
    ...Array.from({ length: 30 }, (_, i) => `x-pack/a/file_${i}.ts`),
    ...Array.from({ length: 20 }, (_, i) => `packages/b/c/file_${i}.ts`),
  ];

  it('assigns every file to exactly one shard path', () => {
    const paths = getShardPaths(files, 4).flat();

    for (const file of files) {
      expect(paths.filter((path) => isUnder(file, path))).toHaveLength(1);
    }
  });

  it('splits large directories so shards stay balanced', () => {
    const counts = getShardPaths(files, 4).map(
      (shard) => files.filter((file) => shard.some((path) => isUnder(file, path))).length
    );

    expect(counts).toHaveLength(4);
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(4);
  });

  it('returns no empty shards when there are fewer paths than shards', () => {
    const shards = getShardPaths(['a.ts', 'b.ts'], 8);

    expect(shards).toHaveLength(2);
    expect(shards.flat().sort()).toEqual(['a.ts', 'b.ts']);
  });

  it('passes directories within the size budget whole instead of their files', () => {
    const dirs = Array.from({ length: 32 }, (_, i) => `pkg_${i}`);
    const dirFiles = dirs.flatMap((dir) =>
      Array.from({ length: 5 }, (_, i) => `${dir}/file_${i}.ts`)
    );

    expect(getShardPaths(dirFiles, 2).flat().sort()).toEqual([...dirs].sort());
  });
});
