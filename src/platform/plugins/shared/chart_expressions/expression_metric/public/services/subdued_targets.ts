/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useSyncExternalStore } from 'react';
import { BehaviorSubject } from 'rxjs';
import { DEFAULT_SUBDUED_TARGETS, type SubduedTargets } from '../components/metric_tile_colors';

const STORAGE_KEY = 'expressionMetricVis.subduedTargets';

const load = (): SubduedTargets => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored
      ? { ...DEFAULT_SUBDUED_TARGETS, ...JSON.parse(stored) }
      : { ...DEFAULT_SUBDUED_TARGETS };
  } catch {
    return { ...DEFAULT_SUBDUED_TARGETS };
  }
};

const targets$ = new BehaviorSubject<SubduedTargets>(load());

/** Sets some of the subdued tiles' Lc targets, and keeps them for the next page load. */
export const setSubduedTargets = (changes: Partial<SubduedTargets>): void => {
  const next = { ...targets$.getValue(), ...changes };
  targets$.next(next);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // The targets still apply to this page without storage.
  }
};

/** Puts the subdued tiles' Lc targets back to their defaults. */
export const resetSubduedTargets = (): void => {
  targets$.next({ ...DEFAULT_SUBDUED_TARGETS });
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // The defaults still apply to this page without storage.
  }
};

const subscribe = (onChange: () => void) => {
  const subscription = targets$.subscribe(onChange);
  return () => subscription.unsubscribe();
};

const getSnapshot = () => targets$.getValue();

/** The subdued tiles' Lc targets, as set from the developer toolbar. */
export const useSubduedTargets = (): SubduedTargets => useSyncExternalStore(subscribe, getSnapshot);
