/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isEqual } from 'lodash';
import type { Observable } from 'rxjs';

export interface ProfileStateMutationOptions {
  /**
   * Controls how URL-backed hosts update browser history for this mutation.
   */
  historyMethod?: 'push' | 'replace';
}

/**
 * Host-backed profile state API exposed to profile extension point implementations.
 */
export interface ProfileStateAdapter<TState extends object> {
  /**
   * Returns the current state, falling back to the definition's default state before any value is
   * written by the host.
   */
  getState: () => TState;
  /**
   * Emits the current state and subsequent state changes.
   */
  getState$: () => Observable<TState>;
  /**
   * Replaces the full state value.
   */
  setState: (state: TState, options?: ProfileStateMutationOptions) => void;
  /**
   * Applies a shallow immutable update to the current state.
   */
  updateState: (stateUpdate: Partial<TState>, options?: ProfileStateMutationOptions) => void;
}

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
export type ProfileStateDescriptor<TState extends object> = {
  [key in keyof TState]: {
    type: ProfileStateType;
  };
};

/**
 * Typed state definition registered by profile providers and consumed via
 * `ContextAwarenessToolkit.getStateAdapter`.
 */
export interface ProfileStateDefinition<TState extends object> {
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
export type ProfileStateMap = Record<string, object | undefined>;

/**
 * Controls how registered default values are handled when filtering profile state.
 */
export type ProfileStateDefaultsHandling = 'none' | 'expand' | 'strip';

type ProfileStateDescriptorEntry<TState extends object> = [
  keyof TState,
  ProfileStateDescriptor<TState>[keyof TState]
];

const getProfileStateDescriptorEntries = <TState extends object>(
  descriptor: ProfileStateDescriptor<TState>
): Array<ProfileStateDescriptorEntry<TState>> => {
  return Object.entries(descriptor) as Array<ProfileStateDescriptorEntry<TState>>;
};

/**
 * Registry of profile state definitions supported by Discover.
 */
export class ProfileStateRegistry {
  private readonly stateDefinitions = new Map<
    string,
    ProfileStateDefinition<Record<string, unknown>>
  >();

  /**
   * Registers a profile state definition. Keys must be globally unique.
   */
  public registerDefinition<TState extends object>(definition: ProfileStateDefinition<TState>) {
    if (this.stateDefinitions.has(definition.key)) {
      throw new Error(`State with key ${definition.key} is already registered.`);
    }

    this.stateDefinitions.set(
      definition.key,
      definition as ProfileStateDefinition<Record<string, unknown>>
    );
  }

  /**
   * Returns true when the requested definition matches the registered descriptor and default state.
   */
  public hasDefinition<TState extends object>(definition: ProfileStateDefinition<TState>): boolean {
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
    const mergedStateMap: Record<string, Record<string, unknown>> = {};

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
  public filterFieldsByType<TState extends object>({
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

/**
 * Creates a definition-validated, cached adapter factory for host-specific state adapters.
 */
export const createProfileStateAdapterFactory = ({
  createAdapter,
  profileStateRegistry,
}: {
  createAdapter: <TState extends object>(
    definition: ProfileStateDefinition<TState>
  ) => ProfileStateAdapter<TState>;
  profileStateRegistry: ProfileStateRegistry;
}) => {
  const stateAdapters = new Map<string, ProfileStateAdapter<Record<string, unknown>>>();

  return <TState extends object>(definition: ProfileStateDefinition<TState>) => {
    if (!profileStateRegistry.hasDefinition(definition)) {
      throw new Error(`State with key ${definition.key} is not registered.`);
    }

    const existingAdapter = stateAdapters.get(definition.key);

    if (existingAdapter) {
      return existingAdapter as ProfileStateAdapter<TState>;
    }

    const adapter = createAdapter(definition);
    stateAdapters.set(definition.key, adapter as ProfileStateAdapter<Record<string, unknown>>);

    return adapter;
  };
};
