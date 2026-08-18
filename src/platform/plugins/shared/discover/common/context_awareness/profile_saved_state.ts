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

/** Saved payloads by tab type, derived from the saved object schema. */
export type TabTypeStateMap = {
  [T in DiscoverSessionTabTypeState as T['type']]: Omit<T, 'type'>;
};

/** Maps runtime profile state to and from part of a tab type's saved payload. */
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
 * Identity helper so callers don't have to write the transform's generics by hand.
 */
export const createProfileSavedStateTransform = <
  TTabType extends keyof TabTypeStateMap,
  TState extends SerializableRecord,
  TField extends keyof TabTypeStateMap[TTabType]
>(
  transform: ProfileSavedStateTransform<TTabType, TState, TField>
): ProfileSavedStateTransform<TTabType, TState, TField> => transform;

/** Type-erased storage for transforms with heterogeneous state and saved fields. */
interface RegisteredTransform {
  stateDefinition: ProfileStateDefinition<SerializableRecord>;
  savedFields: ReadonlySet<string>;
  toSavedState: (state: SerializableRecord) => SerializableRecord;
  fromSavedState: (saved: SerializableRecord) => Partial<SerializableRecord>;
}

/** Converts between runtime profile state and persisted tab type state. */
export class ProfileSavedStateRegistry {
  private readonly transformsByTabType = new Map<string, RegisteredTransform[]>();

  /** Registers a transform, rejecting saved fields already claimed for its tab type. */
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
        toSavedState: transform.toSavedState as unknown as (
          state: SerializableRecord
        ) => SerializableRecord,
        fromSavedState: transform.fromSavedState as unknown as (
          saved: SerializableRecord
        ) => Partial<SerializableRecord>,
      },
    ]);
  }

  /** Builds saved state from each transform's effective runtime state. */
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

    return { type: tabType, ...payload } as DiscoverSessionTabTypeState;
  }

  /** Restores registered profile state and ignores unclaimed saved fields. */
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
