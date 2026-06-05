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

export interface ProfileStateAdapter<TState extends object> {
  getState: () => TState;
  getState$: () => Observable<TState>;
  setState: (state: TState) => void;
  updateState: (stateUpdate: Partial<TState>) => void;
}

export enum ProfileStateType {
  Ui = 'ui',
  Url = 'url',
  Persistent = 'persistent',
}

export type ProfileStateDescriptor<TState extends object> = {
  [key in keyof TState]: {
    type: ProfileStateType;
  };
};

export interface ProfileStateDefinition<TState extends object> {
  key: string;
  descriptor: ProfileStateDescriptor<TState>;
}

export class ProfileStateRegistry {
  private readonly stateDefinitions = new Map<
    string,
    ProfileStateDefinition<Record<string, unknown>>
  >();

  public registerDefinition<TState extends object>(definition: ProfileStateDefinition<TState>) {
    if (this.stateDefinitions.has(definition.key)) {
      throw new Error(`State with key ${definition.key} is already registered.`);
    }

    this.stateDefinitions.set(
      definition.key,
      definition as unknown as ProfileStateDefinition<Record<string, unknown>>
    );
  }

  public hasDefinition<TState extends object>(definition: ProfileStateDefinition<TState>): boolean {
    const registeredDefinition = this.stateDefinitions.get(definition.key);

    if (!registeredDefinition) {
      return false;
    }

    return isEqual(registeredDefinition.descriptor, definition.descriptor);
  }

  public pickStateByType({
    profileState,
    stateType,
  }: {
    profileState: Record<string, object | undefined>;
    stateType: ProfileStateType;
  }): Record<string, object | undefined> {
    const filteredProfileState: Record<string, object | undefined> = {};

    for (const [rawKey, state] of Object.entries(profileState)) {
      if (!state) {
        continue;
      }

      const definition = this.stateDefinitions.get(rawKey);

      if (!definition) {
        continue;
      }

      const filteredState: Record<string, unknown> = {};

      for (const [field, value] of Object.entries(state)) {
        if (definition.descriptor[field]?.type === stateType) {
          filteredState[field] = value;
        }
      }

      if (Object.keys(filteredState).length > 0) {
        filteredProfileState[rawKey] = filteredState;
      }
    }

    return filteredProfileState;
  }
}
