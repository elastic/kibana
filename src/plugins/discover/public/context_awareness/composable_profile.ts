/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Profile } from './types';

/**
 * A partial profile implementation
 */
export type PartialProfile = Partial<Profile>;

/**
 * An accessor function that allows retrieving the extension point result from previous profiles
 */
export type ComposableAccessor<T> = (getPrevious: T) => T;

/**
 * A partial profile implementation that supports composition across multiple profiles
 */
export type ComposableProfile<TProfile extends PartialProfile = Profile> = {
  [TKey in keyof TProfile]?: ComposableAccessor<TProfile[TKey]>;
};

/**
 * Merges extension point implementations from multiple profiles into a single accessor function
 * @param profiles The profiles to merge
 * @param key The key of the extension point to merge
 * @param baseImpl The base implementation for the extension point
 * @returns The merged extension point accessor function
 */
export const getMergedAccessor = <TKey extends keyof Profile>(
  profiles: ComposableProfile[],
  key: TKey,
  baseImpl: Profile[TKey]
) => {
  return profiles.reduce((nextAccessor, profile) => {
    const currentAccessor = profile[key];
    return currentAccessor ? currentAccessor(nextAccessor) : nextAccessor;
  }, baseImpl);
};
