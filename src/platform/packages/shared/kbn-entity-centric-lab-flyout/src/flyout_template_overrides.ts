/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Per-entity-type overrides for the flyout's tab list.
 *
 * The "Manage entity types" wizard in the Streams app lets users reorder /
 * toggle / rename the tabs that appear in the entity flyout. The wizard
 * writes the resulting list here via {@link setFlyoutTemplateOverride}; the
 * flyout reads it back at render time via {@link useFlyoutTemplateOverride}.
 *
 * Keyed by the specific `FakeEntityType.id` (e.g. `aws-ec2`, `k8s-pod`) —
 * the same id the display-config and enablement stores use. Both sides
 * resolve that id the same way (write: `draft.entityType.id`; read:
 * `resolveEntityTypeIdForName(name, type)`), so customizing e.g. AWS EC2
 * affects only EC2 and not every cloud type. (It used to be keyed by the
 * coarse `EntityKind`, which collapsed all cloud types onto one `'cloud'`
 * bucket — editing one silently overwrote the others.)
 *
 * Storage strategy:
 *   - In-memory `Map` for fast synchronous reads inside React renders.
 *   - `localStorage` mirror so the demo survives a hard reload, which makes
 *     the flow feel real ("I configured EC2, refreshed, my config is
 *     still there").
 *   - Tiny pub-sub so multiple flyouts open in the same session see updates
 *     immediately (no React context required, which keeps both sides of the
 *     shared/`streams_app` boundary loosely coupled).
 *
 * NB this is lab-only state — no migration story, no schema versioning
 * beyond the storage key. The key is `v2` because the key dimension changed
 * from `EntityKind` to entity-type id; that cleanly drops legacy kind-keyed
 * payloads rather than mis-applying them.
 */

import { useSyncExternalStore } from 'react';

/** A specific entity type's id, e.g. `aws-ec2` / `k8s-pod` (`FakeEntityType.id`). */
export type EntityTypeId = string;

const STORAGE_KEY = 'entityCentricLab.flyoutTemplateOverrides.v2';

/**
 * Single tab entry in a flyout-template override.
 *
 * `id` is intentionally `string` (not the flyout's narrow `TabId` union) so
 * the manage-entity-types wizard can emit `'custom' | 'profiling'` (and any
 * future user-defined tab) without dragging the flyout package into the
 * wizard's tab vocabulary. The flyout handles unknown ids by rendering an
 * empty-prompt placeholder labelled with `label`.
 */
export interface FlyoutTabOverride {
  readonly id: string;
  readonly label: string;
  readonly enabled: boolean;
}

/**
 * A single curated link surfaced under the entity flyout's "Custom" tab.
 *
 * `type` is intentionally a plain `string` (not a narrow union) so the
 * shared package doesn't need to know about every link-type label the
 * wizard might add over time. Today the wizard emits
 * `'runbook' | 'dashboard' | 'repository' | 'documentation' | 'other'`,
 * and the flyout maps unknown values to a generic icon.
 */
export interface FlyoutCustomLink {
  readonly id: string;
  readonly type: string;
  readonly url: string;
  readonly label: string;
}

export interface FlyoutTemplateOverride {
  readonly flyoutTabs: readonly FlyoutTabOverride[];
  /**
   * Optional list of curated links to render under the "Custom" tab.
   * Omitted (or empty) means the flyout falls back to its built-in
   * empty-state placeholder for that tab.
   */
  readonly customLinks?: readonly FlyoutCustomLink[];
}

type Listener = () => void;

const overrides = new Map<EntityTypeId, FlyoutTemplateOverride>();
const listeners = new Set<Listener>();
let hasHydrated = false;

const readStorage = (): Record<string, FlyoutTemplateOverride> => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as Record<string, FlyoutTemplateOverride>;
  } catch {
    // Corrupt payload from a previous session — drop it silently rather than
    // throw inside a React render.
    return {};
  }
};

const writeStorage = (snapshot: Record<string, FlyoutTemplateOverride>): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Out of quota or storage blocked — the in-memory copy is still good for
    // the rest of the session.
  }
};

const hydrateOnce = (): void => {
  if (hasHydrated) return;
  hasHydrated = true;
  const stored = readStorage();
  for (const [entityTypeId, value] of Object.entries(stored)) {
    if (!value || !Array.isArray(value.flyoutTabs)) continue;
    // `customLinks` is optional, but if present must be an array — drop it
    // silently otherwise rather than feeding garbage to the renderer.
    const sanitized: FlyoutTemplateOverride =
      value.customLinks !== undefined && !Array.isArray(value.customLinks)
        ? { flyoutTabs: value.flyoutTabs }
        : value;
    overrides.set(entityTypeId, sanitized);
  }
};

const snapshotForStorage = (): Record<string, FlyoutTemplateOverride> => {
  const out: Record<string, FlyoutTemplateOverride> = {};
  for (const [entityTypeId, value] of overrides.entries()) {
    out[entityTypeId] = value;
  }
  return out;
};

const notify = (): void => {
  for (const listener of listeners) {
    listener();
  }
};

/**
 * Replace the override for `entityTypeId` and persist it. Pass `undefined`
 * for `override` to clear it (returning the entity flyout to its built-in
 * tab set for that type).
 */
export const setFlyoutTemplateOverride = (
  entityTypeId: EntityTypeId,
  override: FlyoutTemplateOverride | undefined
): void => {
  hydrateOnce();
  if (override === undefined) {
    if (!overrides.has(entityTypeId)) return;
    overrides.delete(entityTypeId);
  } else {
    overrides.set(entityTypeId, override);
  }
  writeStorage(snapshotForStorage());
  notify();
};

/**
 * Synchronous lookup — returns `undefined` when no override is registered
 * for `entityTypeId` (or when it's `undefined`, e.g. for an entity whose
 * type couldn't be resolved to an id). Callers should fall back to their
 * built-in tab list in that case.
 */
export const getFlyoutTemplateOverride = (
  entityTypeId: EntityTypeId | undefined
): FlyoutTemplateOverride | undefined => {
  hydrateOnce();
  if (!entityTypeId) return undefined;
  return overrides.get(entityTypeId);
};

/**
 * Subscribe to override changes. Returns an unsubscribe function. Used
 * internally by {@link useFlyoutTemplateOverride}; exported for tests and
 * for any future non-React consumer.
 */
export const subscribeFlyoutTemplateOverrides = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/**
 * React hook variant of {@link getFlyoutTemplateOverride}. Re-renders the
 * caller whenever an override for any type changes — the per-type filter
 * happens inside the snapshot getter, which keeps the subscription itself
 * cheap (one global set of listeners regardless of how many flyouts are
 * open).
 */
export const useFlyoutTemplateOverride = (
  entityTypeId: EntityTypeId | undefined
): FlyoutTemplateOverride | undefined =>
  useSyncExternalStore(
    subscribeFlyoutTemplateOverrides,
    () => getFlyoutTemplateOverride(entityTypeId),
    // SSR snapshot: never resolves an override server-side — the lab is a
    // pure browser feature anyway, and this keeps Node renders deterministic.
    () => undefined
  );
