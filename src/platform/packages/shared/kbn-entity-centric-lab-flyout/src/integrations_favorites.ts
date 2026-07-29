/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Favorited ("starred") integrations store for the Super-short-term lab.
 *
 * Two consumers, two access styles, one source of truth:
 *   - The Observability nav needs an RxJS stream so a "Starred integrations"
 *     section can be rebuilt whenever the set changes — {@link getIntegrationFavorites$}
 *     feeds the nav tree's `combineLatest`.
 *   - The Streams integration pages toggle stars and render reactively —
 *     {@link useFavoriteIntegrations} / {@link toggleFavoriteIntegration}.
 *
 * State is a `BehaviorSubject<string[]>` anchored on `globalThis` so every
 * bundle that imports this package (Observability nav, Streams app) shares the
 * same instance — writing from the page re-emits to the nav's subscription.
 * Persisted to `localStorage` so the demo survives a reload.
 *
 * NB lab-only state — no migration story beyond the versioned storage key.
 */

import { useSyncExternalStore } from 'react';
import { BehaviorSubject } from 'rxjs';
import type { Observable } from 'rxjs';

const STORAGE_KEY = 'entityCentricLab.integrationFavorites.v1';
const GLOBAL_STATE_KEY = '__kbnEntityCentricLab_integrationFavorites_v1__' as const;

interface SharedState {
  readonly subject: BehaviorSubject<string[]>;
  hydrated: boolean;
}

const readStorage = (): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is string => typeof value === 'string');
  } catch {
    return [];
  }
};

const writeStorage = (snapshot: readonly string[]): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Out of quota or storage blocked — the in-memory copy is still good.
  }
};

const getSharedState = (): SharedState => {
  const root = globalThis as unknown as Record<string, SharedState | undefined>;
  let state = root[GLOBAL_STATE_KEY];
  if (!state) {
    state = { subject: new BehaviorSubject<string[]>([]), hydrated: false };
    root[GLOBAL_STATE_KEY] = state;
  }
  return state;
};

const hydrateOnce = (): SharedState => {
  const state = getSharedState();
  if (state.hydrated) return state;
  state.hydrated = true;
  const stored = readStorage();
  if (stored.length > 0) state.subject.next(stored);
  return state;
};

/** Current favorited integration ids (order = insertion order). */
export const getFavoriteIntegrationIds = (): string[] => hydrateOnce().subject.getValue();

export const isFavoriteIntegration = (id: string): boolean =>
  getFavoriteIntegrationIds().includes(id);

/**
 * Add or remove an integration from the favorites set and persist it.
 * No-op if the requested state already matches.
 */
export const setFavoriteIntegration = (id: string, favorite: boolean): void => {
  const { subject } = hydrateOnce();
  const current = subject.getValue();
  const isFavorite = current.includes(id);
  if (isFavorite === favorite) return;
  const next = favorite ? [...current, id] : current.filter((value) => value !== id);
  writeStorage(next);
  subject.next(next);
};

export const toggleFavoriteIntegration = (id: string): void =>
  setFavoriteIntegration(id, !isFavoriteIntegration(id));

/**
 * RxJS stream of favorited ids. Used by the Observability nav tree so the
 * "Starred integrations" section rebuilds when the set changes.
 */
export const getIntegrationFavorites$ = (): Observable<string[]> =>
  hydrateOnce().subject.asObservable();

/**
 * React hook: re-renders the caller whenever the favorites set changes.
 * Returns the current list of favorited ids.
 */
export const useFavoriteIntegrations = (): string[] =>
  useSyncExternalStore(
    (listener) => {
      const subscription = hydrateOnce().subject.subscribe(() => listener());
      return () => subscription.unsubscribe();
    },
    getFavoriteIntegrationIds,
    () => []
  );
