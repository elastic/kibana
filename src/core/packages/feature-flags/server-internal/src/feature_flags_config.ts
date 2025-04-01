/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ServiceConfigDescriptor } from '@kbn/core-base-server-internal';
import { schema } from '@kbn/config-schema';

/**
 * The definition of the validation config schema
 * @private
 */
const configSchema = schema.object({
  overrides: schema.maybe(schema.recordOf(schema.string(), schema.any())),
});

/**
 * Type definition of the Feature Flags configuration
 * @private
 */
export interface FeatureFlagsConfig {
  overrides?: Record<string, unknown>;
}

/**
 * Config descriptor for the feature flags service
 * @private
 */
export const featureFlagsConfig: ServiceConfigDescriptor<FeatureFlagsConfig> = {
  /**
   * All config is prefixed by `feature_flags`
   */
  path: 'feature_flags',
  /**
   * The definition of the validation config schema
   */
  schema: configSchema,
};
