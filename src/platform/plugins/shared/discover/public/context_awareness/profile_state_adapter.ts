/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializableRecord } from '@kbn/utility-types';
import { memoize } from 'lodash';
import type { Observable } from 'rxjs';
import type { ProfileStateDefinition, ProfileStateRegistry } from '../../common/context_awareness';

/** Options controlling how a profile state mutation is applied by its host. */
export interface ProfileStateMutationOptions {
  /**
   * Controls how URL-backed hosts update browser history for this mutation.
   */
  historyMethod?: 'push' | 'replace';
}

/**
 * Host-backed profile state API exposed to profile extension point implementations.
 */
export interface ProfileStateAdapter<TState extends SerializableRecord> {
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
 * Creates a definition-validated, cached adapter factory for host-specific state adapters.
 */
export const createProfileStateAdapterFactory = ({
  createAdapter,
  profileStateRegistry,
}: {
  createAdapter: <TState extends SerializableRecord>(
    definition: ProfileStateDefinition<TState>
  ) => ProfileStateAdapter<TState>;
  profileStateRegistry: ProfileStateRegistry;
}) => {
  const getOrCreateAdapter = memoize(
    <TState extends SerializableRecord>(definition: ProfileStateDefinition<TState>) => {
      return createAdapter(definition);
    },
    (definition) => definition.key
  );

  return <TState extends SerializableRecord>(definition: ProfileStateDefinition<TState>) => {
    if (!profileStateRegistry.hasDefinition(definition)) {
      throw new Error(`State with key ${definition.key} is not registered.`);
    }

    return getOrCreateAdapter(definition);
  };
};
