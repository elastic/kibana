/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  FeatureFlagsRequestHandlerContext,
  FeatureFlagsStart,
} from '@kbn/core-feature-flags-server';

/**
 * The {@link FeatureFlagsRequestHandlerContext} implementation.
 * @internal
 */
export class CoreFeatureFlagsRouteHandlerContext implements FeatureFlagsRequestHandlerContext {
  constructor(private readonly featureFlags: FeatureFlagsStart) {}

  public getBooleanValue(flagName: string, fallback: boolean): Promise<boolean> {
    return this.featureFlags.getBooleanValue(flagName, fallback);
  }

  public getStringValue<Value extends string>(flagName: string, fallback: Value): Promise<Value> {
    return this.featureFlags.getStringValue(flagName, fallback);
  }

  public getNumberValue<Value extends number>(flagName: string, fallback: Value): Promise<Value> {
    return this.featureFlags.getNumberValue(flagName, fallback);
  }
}
