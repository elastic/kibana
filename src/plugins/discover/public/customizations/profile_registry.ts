/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CustomizationCallback } from './types';

export interface DiscoverProfile {
  name: string;
  customizationCallbacks: CustomizationCallback[];
}

export interface DiscoverProfileRegistry {
  get(name: string): DiscoverProfile | undefined;
  set(profile: DiscoverProfile): void;
}

export const createProfileRegistry = (): DiscoverProfileRegistry => {
  const profiles = new Map<string, DiscoverProfile>();

  return {
    get: (name) => profiles.get(name.toLowerCase()),
    set: (profile) => profiles.set(profile.name.toLowerCase(), profile),
  };
};
