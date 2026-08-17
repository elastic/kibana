/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ProfileSavedStateRegistry } from './profile_saved_state';
import { METRICS_GRID_SAVED_STATE_TRANSFORM } from './profile_saved_state_transforms/metrics_grid_saved_state_transform';

/** Creates the Discover profile saved state registry with all supported transforms registered. */
export const createProfileSavedStateRegistry = () => {
  const registry = new ProfileSavedStateRegistry();

  registry.registerTransform(METRICS_GRID_SAVED_STATE_TRANSFORM);

  return registry;
};
