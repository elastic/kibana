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
 *     section can be rebuilt whenever the set changes — {@link getFavoritesState$}
 *     / {@link getIntegrationFavorites$} feed the nav tree's `combineLatest`.
 *   - The Streams integration pages toggle stars, manage groups, and render
 *     reactively — {@link useFavoriteIntegrations} / {@link useFavoritesState}
 *     and the mutation helpers below.
 *
 * State is a `BehaviorSubject<FavoritesState>` anchored on `globalThis` so every
 * bundle that imports this package (Observability nav, Streams app) shares the
 * same instance — writing from the page re-emits to the nav's subscription.
 * Persisted to `localStorage` so the demo survives a reload.
 *
 * "Nested nav" (grouped favorites) is an opt-in behind a separate flag —
 * {@link getNestedNavEnabled$} / {@link setNestedNavEnabled}. When it's off the
 * store behaves exactly like the original flat list: favorites live in
 * `ungrouped` and every existing API keeps its original shape.
 *
 * Invariant: an integration id appears in at most one place — either in
 * `ungrouped` or inside exactly one group's `integrationIds` (single
 * membership). Empty groups are preserved (they only disappear on explicit
 * delete).
 *
 * NB lab-only state — no migration story beyond the versioned storage keys.
 */

import { useMemo, useSyncExternalStore } from 'react';
import { BehaviorSubject } from 'rxjs';
import { map } from 'rxjs';
import type { Observable } from 'rxjs';

/** A user-created group of starred integrations. */
export interface FavoriteGroup {
  readonly id: string;
  readonly name: string;
  readonly integrationIds: readonly string[];
}

/** The full favorites state: ungrouped stars plus named groups. */
export interface FavoritesState {
  readonly ungrouped: readonly string[];
  readonly groups: readonly FavoriteGroup[];
}

const EMPTY_STATE: FavoritesState = { ungrouped: [], groups: [] };

/** Legacy flat-array key — read once for migration into the v2 shape. */
const STORAGE_KEY_V1 = 'entityCentricLab.integrationFavorites.v1';
const STORAGE_KEY_V2 = 'entityCentricLab.integrationFavorites.v2';
const NESTED_NAV_STORAGE_KEY = 'entityCentricLab.nestedNavEnabled';

const GLOBAL_STATE_KEY = '__kbnEntityCentricLab_integrationFavorites_v2__' as const;
const GLOBAL_NESTED_KEY = '__kbnEntityCentricLab_nestedNavEnabled__' as const;

interface SharedState {
  readonly subject: BehaviorSubject<FavoritesState>;
  hydrated: boolean;
}

interface NestedFlagState {
  readonly subject: BehaviorSubject<boolean>;
  hydrated: boolean;
}

let groupIdCounter = 0;

const createGroupId = (): string =>
  `group-${Date.now().toString(36)}-${(groupIdCounter++).toString(36)}`;

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === 'string');

const sanitizeState = (value: unknown): FavoritesState | null => {
  if (typeof value !== 'object' || value === null) return null;
  const candidate = value as { ungrouped?: unknown; groups?: unknown };
  if (!isStringArray(candidate.ungrouped)) return null;
  if (!Array.isArray(candidate.groups)) return null;

  const groups: FavoriteGroup[] = [];
  for (const rawGroup of candidate.groups) {
    if (typeof rawGroup !== 'object' || rawGroup === null) return null;
    const group = rawGroup as { id?: unknown; name?: unknown; integrationIds?: unknown };
    if (typeof group.id !== 'string') return null;
    if (typeof group.name !== 'string') return null;
    if (!isStringArray(group.integrationIds)) return null;
    groups.push({ id: group.id, name: group.name, integrationIds: group.integrationIds });
  }
  return { ungrouped: candidate.ungrouped, groups };
};

const readState = (): FavoritesState => {
  if (typeof window === 'undefined') return EMPTY_STATE;
  try {
    const rawV2 = window.localStorage.getItem(STORAGE_KEY_V2);
    if (rawV2) {
      const parsed = sanitizeState(JSON.parse(rawV2));
      if (parsed) return parsed;
    }
    // Migrate a legacy flat list into `ungrouped` on first read.
    const rawV1 = window.localStorage.getItem(STORAGE_KEY_V1);
    if (rawV1) {
      const parsed: unknown = JSON.parse(rawV1);
      if (isStringArray(parsed) && parsed.length > 0) {
        return { ungrouped: parsed, groups: [] };
      }
    }
  } catch {
    // Corrupt or blocked storage — fall through to the empty state.
  }
  return EMPTY_STATE;
};

const writeState = (state: FavoritesState): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(state));
  } catch {
    // Out of quota or storage blocked — the in-memory copy is still good.
  }
};

const getSharedState = (): SharedState => {
  const root = globalThis as unknown as Record<string, SharedState | undefined>;
  let state = root[GLOBAL_STATE_KEY];
  if (!state) {
    state = { subject: new BehaviorSubject<FavoritesState>(EMPTY_STATE), hydrated: false };
    root[GLOBAL_STATE_KEY] = state;
  }
  return state;
};

const hydrateOnce = (): SharedState => {
  const state = getSharedState();
  if (state.hydrated) return state;
  state.hydrated = true;
  const stored = readState();
  if (stored.ungrouped.length > 0 || stored.groups.length > 0) {
    state.subject.next(stored);
  }
  return state;
};

const updateState = (mutator: (current: FavoritesState) => FavoritesState): void => {
  const { subject } = hydrateOnce();
  const next = mutator(subject.getValue());
  writeState(next);
  subject.next(next);
};

/** Every favorited id across ungrouped + all groups (insertion-ish order). */
const flattenIds = (state: FavoritesState): string[] => [
  ...state.ungrouped,
  ...state.groups.flatMap((group) => [...group.integrationIds]),
];

/** Remove an id from wherever it currently lives (keeps empty groups). */
const withIdRemoved = (state: FavoritesState, id: string): FavoritesState => ({
  ungrouped: state.ungrouped.filter((value) => value !== id),
  groups: state.groups.map((group) =>
    group.integrationIds.includes(id)
      ? { ...group, integrationIds: group.integrationIds.filter((value) => value !== id) }
      : group
  ),
});

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/** Full grouped favorites state. */
export const getFavoritesState = (): FavoritesState => hydrateOnce().subject.getValue();

/** Current favorited integration ids (flattened across groups + ungrouped). */
export const getFavoriteIntegrationIds = (): string[] => flattenIds(getFavoritesState());

export const isFavoriteIntegration = (id: string): boolean =>
  getFavoriteIntegrationIds().includes(id);

/** The group an integration belongs to, or `undefined` when ungrouped/unstarred. */
export const getGroupForIntegration = (id: string): FavoriteGroup | undefined =>
  getFavoritesState().groups.find((group) => group.integrationIds.includes(id));

// ---------------------------------------------------------------------------
// Favorite mutations (flat / OFF-mode compatible)
// ---------------------------------------------------------------------------

/**
 * Add or remove an integration from the favorites set and persist it. Adding
 * places the id in `ungrouped`; removing drops it from wherever it lives.
 * No-op if the requested state already matches.
 */
export const setFavoriteIntegration = (id: string, favorite: boolean): void => {
  const isFavorite = isFavoriteIntegration(id);
  if (isFavorite === favorite) return;
  updateState((current) =>
    favorite ? { ...current, ungrouped: [...current.ungrouped, id] } : withIdRemoved(current, id)
  );
};

export const toggleFavoriteIntegration = (id: string): void =>
  setFavoriteIntegration(id, !isFavoriteIntegration(id));

export const removeFavoriteIntegration = (id: string): void => setFavoriteIntegration(id, false);

// ---------------------------------------------------------------------------
// Group mutations (nested-nav / ON-mode)
// ---------------------------------------------------------------------------

/** Create an empty group and return its generated id. */
export const createGroup = (name: string): string => {
  const groupId = createGroupId();
  updateState((current) => ({
    ...current,
    groups: [...current.groups, { id: groupId, name, integrationIds: [] }],
  }));
  return groupId;
};

/** Rename an existing group. No-op if the group is unknown. */
export const renameGroup = (groupId: string, name: string): void => {
  updateState((current) => ({
    ...current,
    groups: current.groups.map((group) => (group.id === groupId ? { ...group, name } : group)),
  }));
};

/** Delete a group; its members fall back to `ungrouped` (not unfavorited). */
export const deleteGroup = (groupId: string): void => {
  updateState((current) => {
    const target = current.groups.find((group) => group.id === groupId);
    if (!target) return current;
    return {
      ungrouped: [...current.ungrouped, ...target.integrationIds],
      groups: current.groups.filter((group) => group.id !== groupId),
    };
  });
};

/**
 * Favorite an integration (if needed) and place it in `groupId`. Enforces
 * single membership by removing it from any prior location first.
 */
export const addFavoriteToGroup = (id: string, groupId: string): void => {
  updateState((current) => {
    if (!current.groups.some((group) => group.id === groupId)) return current;
    const cleared = withIdRemoved(current, id);
    return {
      ...cleared,
      groups: cleared.groups.map((group) =>
        group.id === groupId ? { ...group, integrationIds: [...group.integrationIds, id] } : group
      ),
    };
  });
};

/** Create a new group and drop the integration straight into it. */
export const addFavoriteToNewGroup = (id: string, name: string): string => {
  const groupId = createGroupId();
  updateState((current) => {
    const cleared = withIdRemoved(current, id);
    return {
      ...cleared,
      groups: [...cleared.groups, { id: groupId, name, integrationIds: [id] }],
    };
  });
  return groupId;
};

/**
 * Move an already-favorited integration to another group, or to `ungrouped`
 * when `target` is `null`. No-op if the integration is not favorited.
 */
export const moveFavoriteToGroup = (id: string, target: string | null): void => {
  if (!isFavoriteIntegration(id)) return;
  if (target === null) {
    updateState((current) => {
      const cleared = withIdRemoved(current, id);
      return { ...cleared, ungrouped: [...cleared.ungrouped, id] };
    });
    return;
  }
  addFavoriteToGroup(id, target);
};

// ---------------------------------------------------------------------------
// Streams / hooks
// ---------------------------------------------------------------------------

/** RxJS stream of the full grouped favorites state. */
export const getFavoritesState$ = (): Observable<FavoritesState> =>
  hydrateOnce().subject.asObservable();

/**
 * RxJS stream of favorited ids (flattened). Retained for callers that only
 * need the flat list (e.g. the legacy nav path).
 */
export const getIntegrationFavorites$ = (): Observable<string[]> =>
  getFavoritesState$().pipe(map(flattenIds));

const subscribeToFavorites = (listener: () => void): (() => void) => {
  const subscription = hydrateOnce().subject.subscribe(() => listener());
  return () => subscription.unsubscribe();
};

/** React hook: current grouped favorites state, re-rendering on change. */
export const useFavoritesState = (): FavoritesState =>
  useSyncExternalStore(subscribeToFavorites, getFavoritesState, () => EMPTY_STATE);

/**
 * React hook: flattened favorited ids, re-rendering on change.
 *
 * Snapshots the *state* (a stable reference between emissions) and derives the
 * flattened list with `useMemo` — returning a freshly-built array straight from
 * `getSnapshot` would make `useSyncExternalStore` re-render on every tick.
 */
export const useFavoriteIntegrations = (): string[] => {
  const state = useSyncExternalStore(subscribeToFavorites, getFavoritesState, () => EMPTY_STATE);
  return useMemo(() => flattenIds(state), [state]);
};

// ---------------------------------------------------------------------------
// Nested-nav opt-in flag
// ---------------------------------------------------------------------------

const readNestedFlag = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(NESTED_NAV_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
};

const writeNestedFlag = (enabled: boolean): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(NESTED_NAV_STORAGE_KEY, enabled ? 'true' : 'false');
  } catch {
    // Storage blocked — the in-memory copy is still good.
  }
};

const getNestedFlagState = (): NestedFlagState => {
  const root = globalThis as unknown as Record<string, NestedFlagState | undefined>;
  let state = root[GLOBAL_NESTED_KEY];
  if (!state) {
    state = { subject: new BehaviorSubject<boolean>(false), hydrated: false };
    root[GLOBAL_NESTED_KEY] = state;
  }
  return state;
};

const hydrateNestedOnce = (): NestedFlagState => {
  const state = getNestedFlagState();
  if (state.hydrated) return state;
  state.hydrated = true;
  const stored = readNestedFlag();
  if (stored) state.subject.next(true);
  return state;
};

/** Whether the grouped ("nested nav") favorites experience is enabled. */
export const getNestedNavEnabled = (): boolean => hydrateNestedOnce().subject.getValue();

export const setNestedNavEnabled = (enabled: boolean): void => {
  const state = hydrateNestedOnce();
  if (state.subject.getValue() === enabled) return;
  writeNestedFlag(enabled);
  state.subject.next(enabled);
};

export const toggleNestedNavEnabled = (): void => setNestedNavEnabled(!getNestedNavEnabled());

/** RxJS stream of the nested-nav flag; drives the nav's grouped rendering. */
export const getNestedNavEnabled$ = (): Observable<boolean> =>
  hydrateNestedOnce().subject.asObservable();

/** React hook: current nested-nav flag, re-rendering on change. */
export const useNestedNavEnabled = (): boolean =>
  useSyncExternalStore(
    (listener) => {
      const subscription = hydrateNestedOnce().subject.subscribe(() => listener());
      return () => subscription.unsubscribe();
    },
    getNestedNavEnabled,
    () => false
  );

// ---------------------------------------------------------------------------
// Nav search query (filters the Infrastructure integrations panel)
// ---------------------------------------------------------------------------

const GLOBAL_SEARCH_KEY = '__kbnEntityCentricLab_integrationsSearch__' as const;

const getSearchState = (): BehaviorSubject<string> => {
  const root = globalThis as unknown as Record<string, BehaviorSubject<string> | undefined>;
  let subject = root[GLOBAL_SEARCH_KEY];
  if (!subject) {
    subject = new BehaviorSubject<string>('');
    root[GLOBAL_SEARCH_KEY] = subject;
  }
  return subject;
};

/**
 * Ephemeral nav search query — deliberately NOT persisted. It filters which
 * integrations show in the Infrastructure panel (both starred and installed)
 * and should reset between sessions.
 */
export const getIntegrationsSearch = (): string => getSearchState().getValue();

export const setIntegrationsSearch = (query: string): void => {
  const subject = getSearchState();
  if (subject.getValue() === query) return;
  subject.next(query);
};

/** RxJS stream of the nav search query; drives the nav's filtered rendering. */
export const getIntegrationsSearch$ = (): Observable<string> => getSearchState().asObservable();

/** React hook: current nav search query, re-rendering on change. */
export const useIntegrationsSearch = (): string =>
  useSyncExternalStore(
    (listener) => {
      const subscription = getSearchState().subscribe(() => listener());
      return () => subscription.unsubscribe();
    },
    getIntegrationsSearch,
    () => ''
  );
