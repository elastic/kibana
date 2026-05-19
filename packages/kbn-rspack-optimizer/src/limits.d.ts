/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolingLog } from '@kbn/tooling-log';
export interface Limits {
  pageLoadAssetSize?: Record<string, number | undefined>;
}
export declare const DEFAULT_LIMITS_PATH: string;
export declare function readLimits(path: string): Limits;
export declare function validateLimitsForAllBundles(
  log: ToolingLog,
  pluginIds: string[],
  limitsPath: string
): void;
/**
 * Read metrics.json from the build output, compute limits (110% of measured size),
 * and write a sorted limits.yml file.
 *
 * Unlike legacy's `dropMissing` parameter, this always starts from an empty
 * object because `--update-limits` always runs a full dist build with all
 * plugins included. Stale entries for removed plugins are cleaned out
 * automatically since only plugins present in metrics.json get entries.
 */
export declare function updateBundleLimits(
  log: ToolingLog,
  metricsPath: string,
  limitsPath: string
): void;
