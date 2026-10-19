/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export declare function slugify(name: string): string;
/**
 * Returns a unique slug per name. Collisions get a numeric suffix (`-2`, `-3`, …).
 *
 * Uses a `nextCounter` map so repeated duplicates probe from where the last
 * allocation left off rather than scanning from 2 each time — amortised O(1).
 */
export declare class IdAllocator {
  private usedIds;
  private nextCounter;
  allocate(name: string): string;
}
