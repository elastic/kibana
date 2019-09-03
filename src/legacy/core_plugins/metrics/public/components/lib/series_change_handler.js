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
import { newMetricAggFn } from './new_metric_agg_fn';
import { isBasicAgg } from '../../../common/agg_lookup';
import { handleAdd, handleChange } from './collection_actions';

export const seriesChangeHandler = (props, items) => doc => {
  // If we only have one sibling and the user changes to a pipeline
  // agg we are going to add the pipeline instead of changing the
  // current item.
  if (items.length === 1 && !isBasicAgg(doc)) {
    handleAdd.call(null, props, () => {
      const metric = newMetricAggFn();
      metric.type = doc.type;
      const incompatPipelines = ['calculation', 'series_agg'];
      if (!_.contains(incompatPipelines, doc.type)) metric.field = doc.id;
      return metric;
    });
  } else {
    handleChange.call(null, props, doc);
  }
};
