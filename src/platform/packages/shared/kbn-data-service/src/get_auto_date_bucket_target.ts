/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DEFAULT_HISTOGRAM_BAR_TARGET, UI_SETTINGS } from './constants';
import type { GetConfigFn } from './types';

/** Auto date histogram and ES|QL BUCKET/TBUCKET N from histogram:barTarget; never clamped to maxBars. */
export function getAutoDateBucketTarget(getConfig: GetConfigFn): number {
  const n = getConfig(UI_SETTINGS.HISTOGRAM_BAR_TARGET, DEFAULT_HISTOGRAM_BAR_TARGET);
  return Number.isInteger(n) && n > 0 ? n : DEFAULT_HISTOGRAM_BAR_TARGET;
}
