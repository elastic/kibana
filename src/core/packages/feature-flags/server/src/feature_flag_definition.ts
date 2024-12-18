/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * List of {@link FeatureFlagDefinition}
 */
export type FeatureFlagDefinitions = Array<
  | FeatureFlagDefinition<'boolean'>
  | FeatureFlagDefinition<'string'>
  | FeatureFlagDefinition<'number'>
>;

/**
 * Definition of a feature flag
 */
export interface FeatureFlagDefinition<ValueType extends 'boolean' | 'string' | 'number'> {
  /**
   * The ID of the feature flag. Used to reference it when evaluating the flag.
   */
  key: string;
  /**
   * Human friendly name.
   */
  name: string;
  /**
   * Description of the purpose of the feature flag.
   */
  description?: string;
  /**
   * Tags to apply to the feature flag for easier categorizing. It may include the plugin, the solution, the team.
   */
  tags: string[];
  /**
   * The type of the values returned by the feature flag ("string", "boolean", or "number").
   */
  variationType: ValueType;
  /**
   * List of variations of the feature flags.
   */
  variations: Array<{
    /**
     * Human friendly name of the variation.
     */
    name: string;
    /**
     * Description of the variation.
     */
    description?: string;
    /**
     * The value of the variation.
     */
    value: ValueType extends 'string' ? string : ValueType extends 'boolean' ? boolean : number;
  }>;
}
