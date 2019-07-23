/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import _ from 'lodash';

/**
 * Get the ResponseAggConfig class for an aggConfig,
 * which might be cached on the aggConfig or created.
 *
 * @param  {AggConfig} agg - the AggConfig the VAC should inherit from
 * @param  {object} props - properties that the VAC should have
 * @return {Constructor} - a constructor for VAC objects that will inherit the aggConfig
 */
export function getResponseAggConfigClass(agg, props) {
  if (agg.$$_ResponseAggConfigClass) {
    return agg.$$_ResponseAggConfigClass;
  } else {
    return (agg.$$_ResponseAggConfigClass = create(agg, props));
  }
}

function create(parentAgg, props) {

  /**
   * AggConfig "wrapper" for multi-value metric aggs which
   * need to modify AggConfig behavior for each value produced.
   *
   * @param {string|number} key - the key or index that identifies
   *                            this part of the multi-value
   */
  function ResponseAggConfig(key) {
    this.key = key;
    this.parentId = this.id;

    const subId = String(key);
    if (subId.indexOf('.') > -1) {
      this.id = this.parentId + '[\'' + subId.replace(/'/g, '\\\'') + '\']';
    } else {
      this.id = this.parentId + '.' + subId;
    }
  }

  ResponseAggConfig.prototype = Object.create(parentAgg, {
    constructor: ResponseAggConfig
  });

  _.assign(ResponseAggConfig.prototype, props);

  return ResponseAggConfig;
}
