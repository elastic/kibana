import type { RollupGetRollupIndexCapsRollupJobSummary as RollupJobSummary } from '@elastic/elasticsearch/lib/api/types';
import type { RollupIndexCapability } from './map_capabilities';
/**
 * Checks if given job configs are compatible by attempting to merge them
 *
 * @param jobs
 * @returns {boolean}
 */
export declare function areJobsCompatible(jobs?: never[]): boolean;
/**
 * Attempts to merge job configurations into a new configuration object keyed
 * by aggregation, then by field
 *
 * @param jobs
 * @returns {{ aggs: Dictionary<unknown> }}
 */
export declare function mergeJobConfigurations(jobs?: RollupJobSummary[]): RollupIndexCapability[string];
