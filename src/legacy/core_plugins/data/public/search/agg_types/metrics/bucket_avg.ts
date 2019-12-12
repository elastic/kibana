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

import { i18n } from '@kbn/i18n';
import { get } from 'lodash';

import { MetricAggType } from './metric_agg_type';
import { makeNestedLabel } from './lib/make_nested_label';
import { siblingPipelineAggHelper } from './lib/sibling_pipeline_agg_helper';
import { METRIC_TYPES } from './metric_agg_types';

const overallAverageLabel = i18n.translate('common.ui.aggTypes.metrics.overallAverageLabel', {
  defaultMessage: 'overall average',
});

const averageBucketTitle = i18n.translate('common.ui.aggTypes.metrics.averageBucketTitle', {
  defaultMessage: 'Average Bucket',
});

export const bucketAvgMetricAgg = new MetricAggType({
  name: METRIC_TYPES.AVG_BUCKET,
  title: averageBucketTitle,
  makeLabel: agg => makeNestedLabel(agg, overallAverageLabel),
  subtype: siblingPipelineAggHelper.subtype,
  params: [...siblingPipelineAggHelper.params()],
  getFormat: siblingPipelineAggHelper.getFormat,
  getValue(agg, bucket) {
    const customMetric = agg.getParam('customMetric');
    const customBucket = agg.getParam('customBucket');
    const scaleMetrics = customMetric.type && customMetric.type.isScalable();

    let value = bucket[agg.id] && bucket[agg.id].value;

    if (scaleMetrics && customBucket.type.name === 'date_histogram') {
      const aggInfo = customBucket.write();

      value *= get(aggInfo, 'bucketInterval.scale', 1);
    }
    return value;
  },
});
