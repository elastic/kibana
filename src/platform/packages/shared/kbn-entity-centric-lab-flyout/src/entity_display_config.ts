/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Per-entity-type display configuration store.
 *
 * The "Manage entity types" wizard now lets the user pick:
 *   - a composite `identifierFields` tuple (the unique key for an
 *     instance of this type)
 *   - a single `displayField` (the field rendered everywhere the entity
 *     appears as text — flyout title, list rows, dependency rows, etc.)
 *
 * Discover and the Streams app both need to read these per-type
 * choices at render time so a `service.name`-by-default service can be
 * re-labelled to `service.environment + service.name`, or a pod can
 * switch its identity from `kubernetes.pod.name` to
 * `kubernetes.pod.uid`. The store lives in the shared package keyed by
 * the opaque `FakeEntityType.id` string so every consumer (regardless
 * of which plugin bundle it ships in) consults the same source of
 * truth — same trick as
 * {@link entity_type_enablement.ts} for the trigger switch.
 *
 * Architecture mirrors the other lab stores:
 *   - In-memory `Map` for fast synchronous reads inside renders.
 *   - `localStorage` mirror so the demo survives a hard reload.
 *   - Tiny pub-sub for live cross-plugin updates without React context.
 *   - State object anchored on `globalThis` so duplicate module
 *     instances (Discover bundle vs Streams bundle) share one cache.
 *
 * NB this is lab-only state — no migration story, no schema versioning
 * beyond the v1 storage key. Bumping the key cleanly invalidates
 * legacy payloads if/when the shape changes.
 */

import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'entityCentricLab.entityDisplayConfig.v1';

/**
 * Per-entity-type display config persisted from the wizard. Both fields
 * mirror their {@link GeneralFields} counterparts in the wizard draft;
 * we duplicate them here (instead of having the flyout reach into the
 * wizard's persistence module — which lives in `streams_app` and isn't
 * importable from Discover) so the shared package stays self-contained.
 */
export interface EntityDisplayConfig {
  /** Composite key; first entry is treated as the canonical primary id. */
  readonly identifierFields: readonly string[];
  /** Single field rendered as the entity's name. */
  readonly displayField: string;
}

type Listener = () => void;

interface SharedState {
  readonly configs: Map<string, EntityDisplayConfig>;
  readonly listeners: Set<Listener>;
  hydrated: boolean;
}

const GLOBAL_STATE_KEY = '__kbnEntityCentricLab_entityDisplayConfig_v1__' as const;

const getSharedState = (): SharedState => {
  const root = globalThis as unknown as Record<string, SharedState | undefined>;
  let state = root[GLOBAL_STATE_KEY];
  if (!state) {
    state = {
      configs: new Map<string, EntityDisplayConfig>(),
      listeners: new Set<Listener>(),
      hydrated: false,
    };
    root[GLOBAL_STATE_KEY] = state;
  }
  return state;
};

const readStorage = (): Record<string, EntityDisplayConfig> => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as Record<string, EntityDisplayConfig>;
  } catch {
    return {};
  }
};

const writeStorage = (snapshot: Record<string, EntityDisplayConfig>): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Out of quota or storage blocked — in-memory copy is still good.
  }
};

const hydrateOnce = (): void => {
  const state = getSharedState();
  if (state.hydrated) return;
  state.hydrated = true;
  for (const [id, value] of Object.entries(readStorage())) {
    if (!value || typeof value !== 'object') continue;
    // Defensive: persisted payloads come from JSON.parse, so any of the
    // expected fields could be missing/garbage. Coerce conservatively
    // and drop the entry entirely if neither field is usable.
    const identifierFields = Array.isArray(value.identifierFields)
      ? value.identifierFields.filter((field): field is string => typeof field === 'string')
      : [];
    const displayField = typeof value.displayField === 'string' ? value.displayField : '';
    if (identifierFields.length === 0 && displayField.length === 0) continue;
    state.configs.set(id, { identifierFields, displayField });
  }
};

const snapshotForStorage = (): Record<string, EntityDisplayConfig> => {
  const out: Record<string, EntityDisplayConfig> = {};
  for (const [id, value] of getSharedState().configs.entries()) {
    out[id] = value;
  }
  return out;
};

const notify = (): void => {
  for (const listener of [...getSharedState().listeners]) listener();
};

/**
 * Synchronous lookup. Returns `undefined` when no config has been
 * persisted for `entityTypeId` (or when it's `undefined`/empty) —
 * callers should fall back to their built-in defaults in that case.
 */
export const getEntityDisplayConfig = (
  entityTypeId: string | undefined
): EntityDisplayConfig | undefined => {
  hydrateOnce();
  if (!entityTypeId) return undefined;
  return getSharedState().configs.get(entityTypeId);
};

/**
 * Replace the display config for `entityTypeId` and persist it. Pass
 * `undefined` to clear (returning the renderers to their defaults for
 * that type). Both fields are trimmed defensively — an all-blank
 * config is treated as "clear" to keep storage clean.
 */
export const setEntityDisplayConfig = (
  entityTypeId: string,
  config: EntityDisplayConfig | undefined
): void => {
  hydrateOnce();
  const { configs } = getSharedState();
  if (config === undefined) {
    if (!configs.has(entityTypeId)) return;
    configs.delete(entityTypeId);
  } else {
    const trimmedIdentifiers = config.identifierFields
      .map((field) => field.trim())
      .filter((field) => field.length > 0);
    const trimmedDisplay = config.displayField.trim();
    if (trimmedIdentifiers.length === 0 && trimmedDisplay.length === 0) {
      if (!configs.has(entityTypeId)) return;
      configs.delete(entityTypeId);
    } else {
      configs.set(entityTypeId, {
        identifierFields: trimmedIdentifiers,
        displayField: trimmedDisplay,
      });
    }
  }
  writeStorage(snapshotForStorage());
  notify();
};

/**
 * Subscribe to display-config changes. Returns an unsubscribe function.
 * Used internally by the React hooks; exported for tests and any
 * future non-React consumer.
 */
export const subscribeEntityDisplayConfig = (listener: Listener): (() => void) => {
  const { listeners } = getSharedState();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/**
 * React hook variant of {@link getEntityDisplayConfig}. Re-renders the
 * caller whenever any entity type's config changes — the per-id filter
 * happens inside the snapshot getter, which keeps the subscription
 * itself cheap.
 */
export const useEntityDisplayConfig = (
  entityTypeId: string | undefined
): EntityDisplayConfig | undefined =>
  useSyncExternalStore(
    subscribeEntityDisplayConfig,
    () => getEntityDisplayConfig(entityTypeId),
    () => undefined
  );
