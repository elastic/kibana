/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * The HTTP request handler context for evaluating feature flags
 */
export interface FeatureFlagsRequestHandlerContext {
  /**
   * Evaluates a boolean flag
   * @param flagName The flag ID to evaluate
   * @param fallbackValue If the flag cannot be evaluated for whatever reason, the fallback value is provided.
   * @public
   */
  getBooleanValue(flagName: string, fallbackValue: boolean): Promise<boolean>;

  /**
   * Evaluates a string flag
   * @param flagName The flag ID to evaluate
   * @param fallbackValue If the flag cannot be evaluated for whatever reason, the fallback value is provided.
   * @public
   */
  getStringValue<Value extends string>(flagName: string, fallbackValue: Value): Promise<Value>;

  /**
   * Evaluates a number flag
   * @param flagName The flag ID to evaluate
   * @param fallbackValue If the flag cannot be evaluated for whatever reason, the fallback value is provided.
   * @public
   */
  getNumberValue<Value extends number>(flagName: string, fallbackValue: Value): Promise<Value>;
}
