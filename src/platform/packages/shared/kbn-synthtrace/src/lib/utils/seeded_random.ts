/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createHash } from 'crypto';

const BYTES_PER_DRAW = 6;
const DRAWS_PER_BLOCK = 5;
const DRAW_RANGE = 2 ** (8 * BYTES_PER_DRAW);

/**
 * A `Math.random` replacement that always returns the same sequence for the same seed. Draws are
 * read from SHA-256 blocks of the seed, so every seed gets 256 bits of state: seeds of different
 * sessions don't collide, and neither do the UUIDs and IDs drawn from them.
 */
export const createSeededRandom = (seed: string): (() => number) => {
  let block: Buffer = Buffer.alloc(0);
  let blockIndex = 0;
  let drawIndex = DRAWS_PER_BLOCK;

  return () => {
    if (drawIndex === DRAWS_PER_BLOCK) {
      block = createHash('sha256').update(`${seed}:${blockIndex++}`).digest();
      drawIndex = 0;
    }
    return block.readUIntBE(BYTES_PER_DRAW * drawIndex++, BYTES_PER_DRAW) / DRAW_RANGE;
  };
};
