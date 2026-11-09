/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { chunkByCountAndBytes } from './chunk_by_count_and_bytes';

const getBytes = (item: number): number => item;

describe('chunkByCountAndBytes', () => {
  it('returns no chunks for no items', () => {
    expect(chunkByCountAndBytes([], { maxCount: 2, maxBytes: 10, getBytes })).toEqual([]);
  });

  it('closes a chunk when it reaches the item count', () => {
    expect(chunkByCountAndBytes([1, 1, 1, 1, 1], { maxCount: 2, maxBytes: 100, getBytes })).toEqual(
      [[1, 1], [1, 1], [1]]
    );
  });

  it('closes a chunk before the next item would exceed the byte limit', () => {
    expect(chunkByCountAndBytes([4, 4, 4, 2], { maxCount: 10, maxBytes: 10, getBytes })).toEqual([
      [4, 4],
      [4, 2],
    ]);
  });

  it('gives an item larger than the byte limit a chunk of its own', () => {
    expect(chunkByCountAndBytes([1, 25, 1], { maxCount: 10, maxBytes: 10, getBytes })).toEqual([
      [1],
      [25],
      [1],
    ]);
  });
});
