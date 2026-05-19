import type { RollupGetRollupIndexCapsResponse } from '@elastic/elasticsearch/lib/api/types';
import type { Dictionary } from 'lodash';
import type { AggregationRestrictions } from '../../../common';
/**
 * A record of capabilities (aggregations) for index rollup jobs
 */
export interface RollupIndexCapability {
    /**
     * A record of capabilities (aggregations) for an index rollup job
     */
    [index: string]: {
        aggs?: Dictionary<AggregationRestrictions>;
        error?: string;
    };
}
/**
 * Get rollup job capabilities
 * @public
 * @param indices rollup job index capabilites
 */
export declare function getCapabilitiesForRollupIndices(indices: RollupGetRollupIndexCapsResponse): RollupIndexCapability;
