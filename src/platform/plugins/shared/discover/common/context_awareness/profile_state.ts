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
import { isEqual } from 'lodash';

/**
 * Field-level lifetime preference for profile state values.
 */
export enum ProfileStateType {
  /**
   * Ephemeral UI state for the current host/session.
   */
  Ui = 'ui',
  /**
   * URL-addressable state when the host supports URL syncing.
   */
  Url = 'url',
  /**
   * Persisted state when the host supports state persistence.
   */
  Persistent = 'persistent',
}

/**
 * Profile state field types that the host persists in local tab storage across reloads.
 */
export const LOCALLY_PERSISTED_PROFILE_STATE_TYPES = [
  ProfileStateType.Persistent,
  ProfileStateType.Url,
];

/**
 * Describes the intended lifetime for each field in a profile state definition.
 */
export type ProfileStateDescriptor<TState extends SerializableRecord> = {
  [key in keyof TState]: {
    type: ProfileStateType;
  };
};

/**
 * Typed state definition registered by profile providers and consumed via
 * `ContextAwarenessToolkit.getStateAdapter`.
 */
export interface ProfileStateDefinition<TState extends SerializableRecord> {
  /**
   * Unique storage key for this profile state blob.
   */
  key: string;
  /**
   * Field-level lifetime metadata for this state shape.
   */
  descriptor: ProfileStateDescriptor<TState>;
  /**
   * Typed fallback returned before any host state has been written.
   */
  defaultState: TState;
}

/**
 * A map of profile state blobs keyed by their registered definition key.
 */
export type ProfileStateMap = Record<string, SerializableRecord | undefined>;

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

/** Identity helper so callers don't have to write the transform's generics by hand. */
export const createProfileSavedStateTransform = <
  TTabType extends keyof TabTypeStateMap,
  TState extends SerializableRecord,
  TField extends keyof TabTypeStateMap[TTabType]
>(
  transform: ProfileSavedStateTransform<TTabType, TState, TField>
): ProfileSavedStateTransform<TTabType, TState, TField> => transform;

/**
 * Controls how registered default values are handled when filtering profile state.
 */
export type ProfileStateDefaultsHandling = 'none' | 'expand' | 'strip';

type ProfileStateDescriptorEntry<TState extends SerializableRecord> = [
  keyof TState,
  ProfileStateDescriptor<TState>[keyof TState]
];

interface RegisteredTransform {
  stateDefinition: ProfileStateDefinition<SerializableRecord>;
  savedFields: ReadonlySet<string>;
  toSavedState: (state: SerializableRecord) => SerializableRecord;
  fromSavedState: (saved: SerializableRecord) => Partial<SerializableRecord>;
}

const getProfileStateDescriptorEntries = <TState extends SerializableRecord>(
  descriptor: ProfileStateDescriptor<TState>
): Array<ProfileStateDescriptorEntry<TState>> => {
  return Object.entries(descriptor) as Array<ProfileStateDescriptorEntry<TState>>;
};

/**
 * Registry of profile state definitions and saved state transforms supported by Discover.
 */
export class ProfileStateRegistry {
  private readonly stateDefinitions = new Map<string, ProfileStateDefinition<SerializableRecord>>();
  private readonly transformsByTabType = new Map<string, RegisteredTransform[]>();

  /**
   * Registers a profile state definition. Keys must be globally unique.
   */
  public registerDefinition<TState extends SerializableRecord>(
    definition: ProfileStateDefinition<TState>
  ) {
    if (this.stateDefinitions.has(definition.key)) {
      throw new Error(`State with key ${definition.key} is already registered.`);
    }

    this.stateDefinitions.set(definition.key, definition);
  }

  /**
   * Returns true when the requested definition matches the registered descriptor and default state.
   */
  public hasDefinition<TState extends SerializableRecord>(
    definition: ProfileStateDefinition<TState>
  ): boolean {
    const registeredDefinition = this.stateDefinitions.get(definition.key);

    if (!registeredDefinition) {
      return false;
    }

    return (
      isEqual(registeredDefinition.descriptor, definition.descriptor) &&
      isEqual(registeredDefinition.defaultState, definition.defaultState)
    );
  }

  /**
   * Registers a saved state transform for an existing matching state definition.
   */
  public registerTransform<
    TTabType extends keyof TabTypeStateMap,
    TState extends SerializableRecord,
    TField extends keyof TabTypeStateMap[TTabType]
  >(transform: ProfileSavedStateTransform<TTabType, TState, TField>) {
    if (!this.hasDefinition(transform.stateDefinition)) {
      throw new Error(
        `A matching state definition with key ${transform.stateDefinition.key} must be registered before its saved state transform.`
      );
    }

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

  /**
   * Builds saved state from each transform's effective runtime state.
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

    return { type: tabType, ...payload } as DiscoverSessionTabTypeState;
  }

  /**
   * Restores registered profile state and ignores unclaimed saved fields.
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
        if (Object.hasOwn(payload, field)) {
          narrowedPayload[field] = payload[field];
        }
      }

      profileStateMap[transform.stateDefinition.key] = transform.fromSavedState(narrowedPayload);
    }

    return profileStateMap;
  }

  /**
   * Filters a profile state map by field lifetime type. Unregistered state keys and entries with no
   * matching fields are omitted from the returned map.
   *
   * When `defaultsHandling` is `expand`, each returned entry is merged over the registered default
   * fields for the requested state types. When `defaultsHandling` is `strip`, default-valued fields
   * are omitted from returned entries.
   */
  public pickStateByType({
    profileStateMap,
    stateTypes,
    defaultsHandling = 'none',
  }: {
    profileStateMap: ProfileStateMap | undefined;
    stateTypes: ProfileStateType[];
    defaultsHandling?: ProfileStateDefaultsHandling;
  }): ProfileStateMap {
    const filteredStateMap: ProfileStateMap = {};

    if (!profileStateMap) {
      return filteredStateMap;
    }

    const stateTypeSet = new Set(stateTypes);

    for (const [stateKey, profileState] of Object.entries(profileStateMap)) {
      const filteredState = this.filterFieldsByType({
        profileState,
        stateKey,
        stateTypes: stateTypeSet,
        defaultsHandling,
      });

      if (filteredState) {
        filteredStateMap[stateKey] = filteredState;
      }
    }

    return filteredStateMap;
  }

  /**
   * Merges registered profile state maps in argument order. Later maps override earlier fields for
   * the same registered state key. Unregistered state keys and fields are omitted.
   */
  public mergeState(
    ...profileStateMaps: Array<ProfileStateMap | null | undefined>
  ): ProfileStateMap {
    const mergedStateMap: ProfileStateMap = {};

    for (const profileStateMap of profileStateMaps) {
      if (!profileStateMap) {
        continue;
      }

      for (const [stateKey, profileState] of Object.entries(profileStateMap)) {
        const definition = this.stateDefinitions.get(stateKey);

        if (!definition || !profileState) {
          continue;
        }

        const mergedProfileState = mergedStateMap[stateKey] ?? {};

        for (const [field, value] of Object.entries(profileState)) {
          if (definition.descriptor[field]?.type) {
            mergedProfileState[field] = value;
          }
        }

        if (Object.keys(mergedProfileState).length > 0) {
          mergedStateMap[stateKey] = mergedProfileState;
        }
      }
    }

    return mergedStateMap;
  }

  /**
   * Filters one profile state object by field lifetime type using the registered definition for
   * `stateKey`.
   *
   * Returns `undefined` when the state key is not registered, the state is missing, or no fields
   * match the requested type. When `defaultsHandling` is `expand`, the matching fields are merged
   * over the registered default fields for the requested state types. When `defaultsHandling` is
   * `strip`, fields equal to the registered defaults are omitted.
   */
  public filterFieldsByType<TState extends SerializableRecord>({
    profileState,
    stateKey,
    stateTypes,
    defaultsHandling = 'none',
  }: {
    profileState: Partial<TState> | undefined;
    stateKey: ProfileStateDefinition<TState>['key'];
    stateTypes: ProfileStateType[] | Set<ProfileStateType>;
    defaultsHandling?: ProfileStateDefaultsHandling;
  }): Partial<TState> | undefined {
    const definition = this.stateDefinitions.get(stateKey) as
      | ProfileStateDefinition<TState>
      | undefined;

    if (!definition || !profileState) {
      return undefined;
    }

    const stateTypeSet = stateTypes instanceof Set ? stateTypes : new Set(stateTypes);
    const filteredState: Partial<TState> = {};

    let shouldReturnFilteredState = false;

    for (const [field, descriptor] of getProfileStateDescriptorEntries(definition.descriptor)) {
      if (!stateTypeSet.has(descriptor.type)) {
        continue;
      }

      const profileStateHasField = Object.hasOwn(profileState, field);

      // Expand fills requested defaults but only returns when at least one requested field is
      // explicit; none preserves explicit fields; strip preserves explicit non-default fields.
      if (defaultsHandling === 'expand') {
        if (profileStateHasField) {
          shouldReturnFilteredState = true;
          filteredState[field] = profileState[field];
        } else {
          filteredState[field] = definition.defaultState[field];
        }
      } else if (
        profileStateHasField &&
        (defaultsHandling === 'none' ||
          !isEqual(profileState[field], definition.defaultState[field]))
      ) {
        shouldReturnFilteredState = true;
        filteredState[field] = profileState[field];
      }
    }

    return shouldReturnFilteredState ? filteredState : undefined;
  }
}
