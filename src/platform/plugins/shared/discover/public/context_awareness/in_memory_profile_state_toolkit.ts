/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isEqual } from 'lodash';
import { BehaviorSubject, distinctUntilChanged } from 'rxjs';
import type { ContextAwarenessToolkit, ContextAwarenessToolkitActions } from './toolkit';
import type {
  ProfileStateAdapter,
  ProfileStateDefinition,
  ProfileStateRegistry,
} from './profile_state';

export const createInMemoryContextAwarenessToolkit = ({
  actions = {},
  profileStateRegistry,
}: {
  actions?: ContextAwarenessToolkitActions;
  profileStateRegistry: ProfileStateRegistry;
}): ContextAwarenessToolkit => {
  const stateAdapters = new Map<string, ProfileStateAdapter<object>>();

  return {
    actions,
    getStateAdapter: <TState extends object>(definition: ProfileStateDefinition<TState>) => {
      if (!profileStateRegistry.hasDefinition(definition)) {
        throw new Error(`State with key ${definition.key} is not registered.`);
      }

      const existingAdapter = stateAdapters.get(definition.key);

      if (existingAdapter) {
        return existingAdapter as unknown as ProfileStateAdapter<TState>;
      }

      const stateSubject = new BehaviorSubject<TState>({} as TState);
      const state$ = stateSubject.pipe(distinctUntilChanged(isEqual));
      const getState = () => stateSubject.getValue();

      const adapter: ProfileStateAdapter<TState> = {
        getState,
        getState$: () => state$,
        setState: (profileState) => {
          stateSubject.next(profileState);
        },
        updateState: (stateUpdate) => {
          stateSubject.next({ ...getState(), ...stateUpdate });
        },
      };

      stateAdapters.set(definition.key, adapter as unknown as ProfileStateAdapter<object>);

      return adapter;
    },
  };
};
