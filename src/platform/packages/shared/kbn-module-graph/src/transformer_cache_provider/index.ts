/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TransformerCache } from './types';

export class TransformerCacheProvider {
  private readonly caches = new Set<TransformerCache<unknown>>();
  private readonly children: Map<TransformerCache<unknown>, Set<TransformerCache<unknown>>> =
    new Map();
  private readonly parents = new Map<TransformerCache<unknown>, TransformerCache<unknown> | null>();

  create<T>(parent?: TransformerCache<unknown>): TransformerCache<T> {
    const cache = new Map<string, T>();

    // Register the cache in our bookkeeping structures.
    this.caches.add(cache);
    this.parents.set(cache, parent ?? null);

    if (parent) {
      let list = this.children.get(parent);
      if (!list) {
        list = new Set();
        this.children.set(parent, list);
      }
      list.add(cache);
    }

    return cache;
  }

  unregister(cache: TransformerCache<unknown>): void {
    const toRemove: Array<TransformerCache<unknown>> = this.collectDescendants(cache, true);

    for (const c of toRemove) {
      this.caches.delete(c);

      // Clean up parent linkage.
      const parent = this.parents.get(c);
      if (parent) {
        const siblings = this.children.get(parent);
        siblings?.delete(c);
        if (siblings && siblings.size === 0) {
          this.children.delete(parent);
        }
      }
      this.parents.delete(c);
      this.children.delete(c);
    }
  }

  invalidate(...args: Array<TransformerCache<unknown> | string>): void {
    const targetCaches: Set<TransformerCache<unknown>> = new Set();
    const filePaths: string[] = [];

    for (const arg of args) {
      if (arg instanceof Map) {
        for (const c of this.collectDescendants(arg as TransformerCache<unknown>, false)) {
          targetCaches.add(c);
        }
      } else if (typeof arg === 'string') {
        filePaths.push(arg);
      }
    }

    // If no caches explicitly targeted, operate over the whole universe.
    if (targetCaches.size === 0) {
      for (const c of this.caches) {
        targetCaches.add(c);
      }
    }

    // Perform the actual invalidation.
    for (const cache of targetCaches) {
      if (filePaths.length === 0) {
        cache.clear();
        continue;
      }
      for (const path of filePaths) {
        cache.delete(path);
      }
    }
  }

  /*
   * -------------------------------------------------
   * Helpers
   * -------------------------------------------------
   */

  private collectDescendants(
    root: TransformerCache<unknown>,
    includeRoot: boolean
  ): Array<TransformerCache<unknown>> {
    const result: Array<TransformerCache<unknown>> = [];
    const stack: Array<TransformerCache<unknown>> = includeRoot
      ? [root]
      : [...(this.children.get(root) ?? [])];

    const visited = new Set<TransformerCache<unknown>>();

    while (stack.length > 0) {
      const current = stack.pop()!;
      if (visited.has(current)) {
        continue;
      }
      visited.add(current);
      result.push(current);

      const children = this.children.get(current);
      if (children) {
        stack.push(...children);
      }
    }

    return result;
  }
}
