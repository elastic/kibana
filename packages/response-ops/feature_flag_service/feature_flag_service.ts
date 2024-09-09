/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

class FeatureFlag<T extends string = string> {
  private readonly featureFlags = new Set<T>();

  constructor(featureFlags: T[]) {
    featureFlags.forEach((featureFlag) => this.featureFlags.add(featureFlag));
  }

  public isFeatureFlagSet(featureFlag: T): boolean {
    return this.featureFlags.has(featureFlag);
  }
}

export const createFeatureFlagService = <T extends string>(featureFlags: T[]) => {
  return new FeatureFlag<(typeof featureFlags)[number]>(featureFlags);
};

export type FeatureFlagService<T extends string = string> = InstanceType<typeof FeatureFlag<T>>;
