/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializableRecord } from '@kbn/utility-types';
import type { DiscoverTabType } from '@kbn/discover-utils';
import type { DiscoverSessionTabTypeState } from '@kbn/saved-search-plugin/common';
import type { ProfileStateDefinition, ProfileStateMap } from './profile_state';

/**
 * The saved payload for each tab type, keyed by `type` with the discriminator field omitted.
 * Derived from the versioned saved object schema (`DiscoverSessionTabTypeState`) rather than
 * restated here, so a new tab type or saved field flows into this map, and into every
 * `ProfileSavedStateTransform` that targets it, automatically.
 */
export type TabTypeStateMap = {
  [T in DiscoverSessionTabTypeState as T['type']]: Omit<T, 'type'>;
};

/**
 * Declares how one `ProfileStateDefinition`'s runtime state contributes a slice of a tab
 * type's saved payload. Several transforms can share a tab type as long as their
 * `savedFields` are disjoint -- `ProfileSavedStateRegistry.registerTransform` enforces this.
 *
 * Saved-ness is deliberately not a field-level annotation on `ProfileStateDefinition`: the two
 * state models (runtime and saved) are parallel, and a transform is the only thing that knows
 * about both.
 */
export interface ProfileSavedStateTransform<
  TTabType extends keyof TabTypeStateMap,
  TState extends SerializableRecord,
  TField extends keyof TabTypeStateMap[TTabType] = keyof TabTypeStateMap[TTabType]
> {
  tabType: TTabType;
  /** Fields of the tab type payload this transform owns. Must not overlap another transform's. */
  savedFields: readonly TField[];
  stateDefinition: ProfileStateDefinition<TState>;
  toSavedState: (state: TState) => Pick<TabTypeStateMap[TTabType], TField>;
  fromSavedState: (saved: Pick<TabTypeStateMap[TTabType], TField>) => Partial<TState>;
}

/**
 * Identity helper so `TField` infers from `savedFields` and callers never write the transform's
 * generics by hand.
 */
export const createProfileSavedStateTransform = <
  TTabType extends keyof TabTypeStateMap,
  TState extends SerializableRecord,
  TField extends keyof TabTypeStateMap[TTabType]
>(
  transform: ProfileSavedStateTransform<TTabType, TState, TField>
): ProfileSavedStateTransform<TTabType, TState, TField> => transform;

/**
 * Storage shape for a registered transform, with its saved-field slice erased to a plain
 * `SerializableRecord`. `registerTransform`'s generics keep each transform sound for its
 * author; the registry itself holds transforms for many different tab types and fields at
 * once, a heterogeneity TypeScript can't express without erasing it somewhere.
 */
interface RegisteredTransform {
  stateDefinition: ProfileStateDefinition<SerializableRecord>;
  savedFields: ReadonlySet<string>;
  toSavedState: (state: SerializableRecord) => SerializableRecord;
  fromSavedState: (saved: SerializableRecord) => Partial<SerializableRecord>;
}

/**
 * Registry of `ProfileSavedStateTransform`s, parallel to and independent of
 * `ProfileStateRegistry`. Connects runtime `ProfileStateMap`s to the saved tab type payload
 * persisted on the Discover session saved object.
 */
export class ProfileSavedStateRegistry {
  private readonly transformsByTabType = new Map<string, RegisteredTransform[]>();

  /**
   * Registers a transform for a tab type. Throws if another transform already registered
   * under the same tab type claims one of `savedFields`.
   */
  public registerTransform<
    TTabType extends keyof TabTypeStateMap,
    TState extends SerializableRecord,
    TField extends keyof TabTypeStateMap[TTabType]
  >(transform: ProfileSavedStateTransform<TTabType, TState, TField>) {
    const existingTransforms = this.transformsByTabType.get(transform.tabType) ?? [];
    const claimedFields = new Set(
      existingTransforms.flatMap(({ savedFields }) => [...savedFields])
    );

    for (const field of transform.savedFields as readonly string[]) {
      if (claimedFields.has(field)) {
        throw new Error(
          `Field "${String(field)}" of tab type "${String(
            transform.tabType
          )}" is already claimed by another transform.`
        );
      }
    }

    this.transformsByTabType.set(transform.tabType, [
      ...existingTransforms,
      {
        stateDefinition: transform.stateDefinition,
        savedFields: new Set(transform.savedFields as readonly string[]),
        // See the `RegisteredTransform` comment: erased from the transform's own slice-typed
        // signature to the registry's erased storage shape.
        toSavedState: transform.toSavedState as unknown as (
          state: SerializableRecord
        ) => SerializableRecord,
        fromSavedState: transform.fromSavedState as unknown as (
          saved: SerializableRecord
        ) => Partial<SerializableRecord>,
      },
    ]);
  }

  /**
   * Builds the saved tab type payload for `tabType` from `profileStateMap`. Each registered
   * transform receives its definition's *effective* state (explicit overrides merged over
   * `defaultState`), matching every other persistence boundary (local storage, the URL) --
   * so a saved session pins its values regardless of what the defaults become later.
   *
   * Returns `undefined` when `tabType` is undefined, otherwise always returns at least
   * `{ type: tabType }`, even when no transform is registered for it, so an unopened tab's
   * type survives a save it never triggered a transform for.
   */
  public toSavedState(
    tabType: DiscoverTabType | undefined,
    profileStateMap: ProfileStateMap
  ): DiscoverSessionTabTypeState | undefined {
    if (!tabType) {
      return undefined;
    }

    const transforms = this.transformsByTabType.get(tabType) ?? [];
    let payload: SerializableRecord = {};

    for (const transform of transforms) {
      const effectiveState = {
        ...transform.stateDefinition.defaultState,
        ...profileStateMap[transform.stateDefinition.key],
      };
      payload = { ...payload, ...transform.toSavedState(effectiveState) };
    }

    // The registry is the only thing that knows both the flat saved payload shape and the
    // per-transform slices that compose it -- asserting the merge back to the discriminated
    // union is what lets each transform stay typed to its own slice.
    return { type: tabType, ...payload } as DiscoverSessionTabTypeState;
  }

  /**
   * Builds a `ProfileStateMap` from a saved tab type payload, keyed by each contributing
   * transform's `stateDefinition.key`. A saved field with no matching transform (e.g. the
   * type was persisted before this transform existed) is silently dropped, the same way
   * `ProfileStateRegistry.mergeState` ignores unregistered keys.
   */
  public fromSavedState(tabTypeState: DiscoverSessionTabTypeState | undefined): ProfileStateMap {
    const profileStateMap: ProfileStateMap = {};

    if (!tabTypeState) {
      return profileStateMap;
    }

    const { type, ...payload } = tabTypeState as SerializableRecord & { type: string };
    const transforms = this.transformsByTabType.get(type) ?? [];

    for (const transform of transforms) {
      const narrowedPayload: SerializableRecord = {};

      for (const field of transform.savedFields) {
        if (Object.hasOwn(payload, field as string)) {
          narrowedPayload[field as string] = payload[field as string];
        }
      }

      profileStateMap[transform.stateDefinition.key] = transform.fromSavedState(narrowedPayload);
    }

    return profileStateMap;
  }
}
