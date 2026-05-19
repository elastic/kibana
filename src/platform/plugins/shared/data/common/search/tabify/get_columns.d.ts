import type { IAggConfig } from '../aggs';
import type { TabbedAggColumn } from './types';
/**
 * Builds tabify columns.
 *
 * @param {AggConfigs} aggs - the agg configs object to which the aggregation response correlates
 * @param {boolean} minimalColumns - setting to true will only return a column for the last bucket/metric instead of one for each level
 */
export declare function tabifyGetColumns(aggs: IAggConfig[], minimalColumns: boolean): TabbedAggColumn[];
