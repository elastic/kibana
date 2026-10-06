import type { IMetricAggConfig } from '../metric_agg_type';
/**
 * Forwards modifyAggConfigOnSearchRequestStart calls to a nested AggConfig.
 * This must be used for each parameter, that accepts a nested aggregation, otherwise
 * some parameters of the nested aggregation might not work properly (like auto interval
 * on a nested date histogram).
 * You should assign the return value of this function to the modifyAggConfigOnSearchRequestStart
 * of the parameter that accepts a nested aggregation. Example:
 * {
 *   name: 'customBucket',
 *   modifyAggConfigOnSearchRequestStart: forwardModifyAggConfigOnSearchRequestStart('customBucket')
 * }
 *
 * @param {string} paramName - The name of the parameter, that this function should forward
 *      calls to. That should match the name of the parameter the function is called on.
 * @returns {function} A function, that forwards the calls.
 */
export declare const forwardModifyAggConfigOnSearchRequestStart: (paramName: string) => (aggConfig: IMetricAggConfig, searchSource?: any, request?: any) => void;
