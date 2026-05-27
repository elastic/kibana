/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable max-classes-per-file */

import type { Observable } from 'rxjs';

export class ProfileStateKey<TState extends object> {
  private declare readonly __stateBrand: (_state: TState) => TState;

  private constructor(public readonly rawKey: string) {}

  static create<TState extends object>(rawKey: string): ProfileStateKey<TState> {
    return new ProfileStateKey<TState>(rawKey);
  }
}

export enum ProfileStateHistoryMethod {
  Push = 'push',
  Replace = 'replace',
}

export interface ProfileStateMutationOptions {
  historyMethod?: ProfileStateHistoryMethod;
}

export interface ProfileStateAdapter<TState extends object> {
  getState: () => TState;
  getState$: () => Observable<TState>;
  setState: (state: TState, options?: ProfileStateMutationOptions) => void;
  updateState: (stateUpdate: Partial<TState>, options?: ProfileStateMutationOptions) => void;
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
  key: ProfileStateKey<TState>;
  descriptor: ProfileStateDescriptor<TState>;
}

export class ProfileStateRegistry {
  private readonly stateDefinitions = new Map<
    string,
    ProfileStateDefinition<Record<string, unknown>>
  >();

  public registerDefinition<TState extends object>(definition: ProfileStateDefinition<TState>) {
    if (this.stateDefinitions.has(definition.key.rawKey)) {
      throw new Error(`State with key ${definition.key.rawKey} is already registered.`);
    }
    this.stateDefinitions.set(
      definition.key.rawKey,
      definition as ProfileStateDefinition<Record<string, unknown>>
    );
  }

  public getDefinition<TState extends object>(
    key: ProfileStateKey<TState>
  ): ProfileStateDefinition<TState> {
    const definition = this.stateDefinitions.get(key.rawKey);
    if (!definition) {
      throw new Error(`State with key ${key.rawKey} is not registered.`);
    }
    return definition as ProfileStateDefinition<TState>;
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

export const registerProfileStateDefinitions = (registry: ProfileStateRegistry) => {
  registry.registerDefinition(colorStateDefinition);
};

export interface ColorState {
  favoriteColor: string;
  rowControlColor: 'primary' | 'success' | 'danger';
}

export const COLOR_STATE_KEY = ProfileStateKey.create<ColorState>('color_state');

const colorStateDefinition: ProfileStateDefinition<ColorState> = {
  key: COLOR_STATE_KEY,
  descriptor: {
    favoriteColor: { type: ProfileStateType.Ui },
    rowControlColor: { type: ProfileStateType.Persistent },
  },
};
