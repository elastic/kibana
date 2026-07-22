/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializableRecord } from '@kbn/utility-types';
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

/**
 * Controls how registered default values are handled when filtering profile state.
 */
export type ProfileStateDefaultsHandling = 'none' | 'expand' | 'strip';

export interface ProfileStateDefinitionReference {
  key: string;
  descriptor: Record<string, { type: ProfileStateType }>;
  defaultState: SerializableRecord;
}

/**
 * Registry of profile state definitions supported by Discover.
 */
export class ProfileStateRegistry {
  private readonly stateDefinitions = new Map<string, ProfileStateDefinitionReference>();

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
   * Filters a profile state map by field lifetime type. Unregistered state keys and entries with no
   * matching fields are omitted from the returned map.
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
   */
  public filterFieldsByType({
    profileState,
    stateKey,
    stateTypes,
    defaultsHandling = 'none',
  }: {
    profileState: SerializableRecord | undefined;
    stateKey: string;
    stateTypes: ProfileStateType[] | Set<ProfileStateType>;
    defaultsHandling?: ProfileStateDefaultsHandling;
  }): SerializableRecord | undefined {
    const definition = this.stateDefinitions.get(stateKey);

    if (!definition || !profileState) {
      return undefined;
    }

    const stateTypeSet = stateTypes instanceof Set ? stateTypes : new Set(stateTypes);
    const filteredState: SerializableRecord = {};

    let shouldReturnFilteredState = false;

    for (const [field, descriptor] of Object.entries(definition.descriptor)) {
      if (!stateTypeSet.has(descriptor.type)) {
        continue;
      }

      const profileStateHasField = Object.hasOwn(profileState, field);

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
