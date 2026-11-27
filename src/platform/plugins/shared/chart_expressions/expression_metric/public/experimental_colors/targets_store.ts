/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';

export type Targets = Readonly<Record<string, number | boolean>>;

export interface TargetsStore<T extends Targets> {
  readonly defaults: T;
  get(): T;
  set(changes: Partial<T>): void;
  reset(): void;
  subscribe(onChange: () => void): () => void;
}

/** A variant's Lc targets, kept in local storage so they survive reloads. */
export const createTargetsStore = <T extends Targets>(id: string, defaults: T): TargetsStore<T> => {
  const storageKey = `expressionMetricVis.experimentalColors.${id}`;

  const load = (): T => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? { ...defaults, ...JSON.parse(stored) } : defaults;
    } catch {
      return defaults;
    }
  };

  const targets$ = new BehaviorSubject<T>(load());

  return {
    defaults,
    get: () => targets$.getValue(),
    set: (changes) => {
      const next = { ...targets$.getValue(), ...changes };
      targets$.next(next);
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // The targets still apply to this page without storage.
      }
    },
    reset: () => {
      targets$.next(defaults);
      try {
        localStorage.removeItem(storageKey);
      } catch {
        // The defaults still apply to this page without storage.
      }
    },
    subscribe: (onChange) => {
      const subscription = targets$.subscribe(onChange);
      return () => subscription.unsubscribe();
    },
  };
};

/** A cache key for a set of targets. */
export const targetsKey = (targets: Targets): string => Object.values(targets).join(',');
