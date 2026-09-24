/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getPointer, setPointer } from './json_pointer';
import type { JsonValue } from './types';

/**
 * A surface's data model, as an external store for `useSyncExternalStore`.
 * Writes are immutable and share untouched subtrees, so identity comparison on
 * a selected value is enough to decide whether a subscriber must re-render.
 */
export class DataModel {
  private root: JsonValue;
  private readonly listeners = new Set<() => void>();

  constructor(initial: JsonValue = {}) {
    this.root = initial;
  }

  getSnapshot = (): JsonValue => this.root;

  get = (pointer: string): JsonValue | undefined => getPointer(this.root, pointer);

  set = (pointer: string, value: JsonValue): void => {
    const next = setPointer(this.root, pointer, value);
    if (next === this.root) return;
    this.root = next;
    this.listeners.forEach((listener) => listener());
  };

  /**
   * Shallow-merges top-level keys, for hosts that share one model across several
   * surfaces. Assignment rather than repeated `set`, because `set(path, null)`
   * *deletes* a key — a surface seeding `{ selected: null }` still needs the key
   * to exist so a binding to it resolves.
   */
  merge = (partial: Record<string, JsonValue>): void => {
    const base =
      typeof this.root === 'object' && this.root !== null && !Array.isArray(this.root)
        ? this.root
        : {};
    this.root = { ...base, ...partial };
    this.listeners.forEach((listener) => listener());
  };

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
}
