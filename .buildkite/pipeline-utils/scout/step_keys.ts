/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** Buildkite step keys of the Scout builder step and the lane steps it uploads. */
export const SCOUT_STEP_KEYS = {
  BUILDER: 'build_scout_tests',
  LANE_PREFIX: 'scout_test_lane_',
} as const;
