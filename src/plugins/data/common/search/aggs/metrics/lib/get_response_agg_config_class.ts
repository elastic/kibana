/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { assignIn } from 'lodash';
import { IMetricAggConfig } from '../metric_agg_type';

/**
 * Get the ResponseAggConfig class for an aggConfig,
 * which might be cached on the aggConfig or created.
 *
 * @param  {AggConfig} agg - the AggConfig the VAC should inherit from
 * @param  {object} props - properties that the VAC should have
 * @return {Constructor} - a constructor for VAC objects that will inherit the aggConfig
 */
export const getResponseAggConfigClass = (agg: any, props: Partial<IMetricAggConfig>) => {
  if (agg.$$_ResponseAggConfigClass) {
    return agg.$$_ResponseAggConfigClass;
  } else {
    return (agg.$$_ResponseAggConfigClass = create(agg, props));
  }
};

export interface IResponseAggConfig extends IMetricAggConfig {
  key: string | number;
  parentId: IMetricAggConfig['id'];
}

export const create = (parentAgg: IMetricAggConfig, props: Partial<IMetricAggConfig>) => {
  /**
   * AggConfig "wrapper" for multi-value metric aggs which
   * need to modify AggConfig behavior for each value produced.
   *
   * @param {string|number} key - the key or index that identifies
   *                            this part of the multi-value
   */
  function ResponseAggConfig(this: IResponseAggConfig, key: string) {
    const parentId = parentAgg.id;
    let id;

    const subId = String(key);

    if (subId.indexOf('.') > -1) {
      id = parentId + "['" + subId.replace(/'/g, "\\'") + "']";
    } else {
      id = parentId + '.' + subId;
    }

    this.id = id;
    this.key = key;
    this.parentId = parentId;
  }

  ResponseAggConfig.prototype = Object.create(parentAgg);
  ResponseAggConfig.prototype.constructor = ResponseAggConfig;

  assignIn(ResponseAggConfig.prototype, props);

  return ResponseAggConfig;
};
