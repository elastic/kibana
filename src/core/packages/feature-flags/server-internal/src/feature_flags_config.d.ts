/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ServiceConfigDescriptor } from '@kbn/core-base-server-internal';
/**
 * Type definition of the Feature Flags configuration
 * @internal
 */
export interface FeatureFlagsConfig {
  overrides?: Record<string, unknown>;
}
/**
 * Config descriptor for the feature flags service
 * @internal
 */
export declare const featureFlagsConfig: ServiceConfigDescriptor<FeatureFlagsConfig>;
