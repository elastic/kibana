/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ProfileStateRegistry } from './profile_state';
import { EXAMPLE_PROFILE_STATE_DEF } from './profile_state_definitions/example_profile_state';
import { METRICS_STATE_DEF } from './profile_state_definitions/metrics_grid_profile_state';
import { METRICS_GRID_SAVED_STATE_TRANSFORM } from './profile_state_transforms/metrics_grid_saved_state_transform';

/** Creates the Discover profile state registry with all supported definitions registered. */
export const createProfileStateRegistry = () => {
  const registry = new ProfileStateRegistry();

  /**
   * Register state definitions
   */
  registry.registerDefinition(EXAMPLE_PROFILE_STATE_DEF);
  registry.registerDefinition(METRICS_STATE_DEF);

  /**
   * Register saved state transforms
   */
  registry.registerTransform(METRICS_GRID_SAVED_STATE_TRANSFORM);

  return registry;
};
