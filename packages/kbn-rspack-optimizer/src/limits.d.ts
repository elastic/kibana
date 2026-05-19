import type { ToolingLog } from '@kbn/tooling-log';
export interface Limits {
    pageLoadAssetSize?: Record<string, number | undefined>;
}
export declare const DEFAULT_LIMITS_PATH: string;
export declare function readLimits(path: string): Limits;
export declare function validateLimitsForAllBundles(log: ToolingLog, pluginIds: string[], limitsPath: string): void;
/**
 * Read metrics.json from the build output, compute limits (110% of measured size),
 * and write a sorted limits.yml file.
 *
 * Unlike legacy's `dropMissing` parameter, this always starts from an empty
 * object because `--update-limits` always runs a full dist build with all
 * plugins included. Stale entries for removed plugins are cleaned out
 * automatically since only plugins present in metrics.json get entries.
 */
export declare function updateBundleLimits(log: ToolingLog, metricsPath: string, limitsPath: string): void;
