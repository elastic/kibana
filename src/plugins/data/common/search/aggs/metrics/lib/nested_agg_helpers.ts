/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { IMetricAggConfig, MetricAggParam } from '../metric_agg_type';

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
export const forwardModifyAggConfigOnSearchRequestStart = (paramName: string) => {
  return (aggConfig: IMetricAggConfig, searchSource?: any, request?: any) => {
    if (!aggConfig || !aggConfig.params) {
      return;
    }

    const nestedAggConfig = aggConfig.getParam(paramName);

    if (nestedAggConfig && nestedAggConfig.type && nestedAggConfig.type.params) {
      nestedAggConfig.type.params.forEach((param: MetricAggParam<IMetricAggConfig>) => {
        // Check if this parameter of the nested aggConfig has a modifyAggConfigOnSearchRequestStart
        // function, that needs to be called.
        if (param.modifyAggConfigOnSearchRequestStart) {
          param.modifyAggConfigOnSearchRequestStart(nestedAggConfig, searchSource, request);
        }
      });
    }
  };
};
