/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Returns a unique slug per name. Collisions get a numeric suffix (`-2`, `-3`, …).
 */
export class IdAllocator {
  private usedIds = new Set<string>();

  allocate(name: string): string {
    const base = slugify(name) || 'step';
    if (!this.usedIds.has(base)) {
      this.usedIds.add(base);
      return base;
    }
    let counter = 2;
    while (this.usedIds.has(`${base}-${counter}`)) {
      counter++;
    }
    const uniqueId = `${base}-${counter}`;
    this.usedIds.add(uniqueId);
    return uniqueId;
  }
}
