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

import { get } from 'lodash';
import { MetricAggType } from './metric_agg_type';
import { makeNestedLabel } from './lib/make_nested_label';
import { siblingPipelineAggHelper } from './lib/sibling_pipeline_agg_helper';
import { i18n } from '@kbn/i18n';

const overallAverageLabel = i18n.translate('common.ui.aggTypes.metrics.overallAverageLabel', {
  defaultMessage: 'overall average'
});

export const bucketAvgMetricAgg = new MetricAggType({
  name: 'avg_bucket',
  title: i18n.translate('common.ui.aggTypes.metrics.averageBucketTitle', {
    defaultMessage: 'Average Bucket'
  }),
  makeLabel: agg => makeNestedLabel(agg, overallAverageLabel),
  subtype: siblingPipelineAggHelper.subtype,
  params: [
    ...siblingPipelineAggHelper.params()
  ],
  getFormat: siblingPipelineAggHelper.getFormat,
  getValue: function (agg, bucket) {
    const customMetric = agg.params.customMetric;
    const scaleMetrics = customMetric.type && customMetric.type.isScalable();

    let value = bucket[agg.id] && bucket[agg.id].value;
    if (scaleMetrics && agg.params.customBucket.type.name === 'date_histogram') {
      const aggInfo = agg.params.customBucket.write();
      value *= get(aggInfo, 'bucketInterval.scale', 1);
    }
    return value;
  }
});
