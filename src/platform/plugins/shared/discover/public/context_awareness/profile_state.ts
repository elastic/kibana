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

export class ProfileStateKey<_TState extends object> {
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
  private readonly stateDefinitions = new Map<string, ProfileStateDefinition<object>>();

  public registerDefinition<TState extends object>(definition: ProfileStateDefinition<TState>) {
    if (this.stateDefinitions.has(definition.key.rawKey)) {
      throw new Error(`State with key ${definition.key.rawKey} is already registered.`);
    }
    this.stateDefinitions.set(definition.key.rawKey, definition);
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
}

export const registerProfileStateDefinitions = (registry: ProfileStateRegistry) => {
  registry.registerDefinition(colorStateDefinition);
};

interface ColorState {
  favouriteColor: string;
  leastFavouriteColor: string;
}

export const COLOR_STATE_KEY = ProfileStateKey.create<ColorState>('color_state');

const colorStateDefinition: ProfileStateDefinition<ColorState> = {
  key: COLOR_STATE_KEY,
  descriptor: {
    favouriteColor: { type: ProfileStateType.Ui },
    leastFavouriteColor: { type: ProfileStateType.Ui },
  },
};
