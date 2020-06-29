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
import { MetricAggType } from './metric_agg_type';
import { makeNestedLabel } from './lib/make_nested_label';
import { siblingPipelineAggHelper } from './lib/sibling_pipeline_agg_helper';
import { METRIC_TYPES } from './metric_agg_types';
import { AggConfigSerialized, BaseAggParams } from '../types';
import { GetInternalStartServicesFn } from '../../../types';

export interface AggParamsBucketMax extends BaseAggParams {
  customMetric?: AggConfigSerialized;
  customBucket?: AggConfigSerialized;
}

export interface BucketMaxMetricAggDependencies {
  getInternalStartServices: GetInternalStartServicesFn;
}

const overallMaxLabel = i18n.translate('data.search.aggs.metrics.overallMaxLabel', {
  defaultMessage: 'overall max',
});

const maxBucketTitle = i18n.translate('data.search.aggs.metrics.maxBucketTitle', {
  defaultMessage: 'Max Bucket',
});

export const getBucketMaxMetricAgg = ({
  getInternalStartServices,
}: BucketMaxMetricAggDependencies) => {
  const { subtype, params, getFormat, getSerializedFormat } = siblingPipelineAggHelper;

  return new MetricAggType(
    {
      name: METRIC_TYPES.MAX_BUCKET,
      title: maxBucketTitle,
      makeLabel: (agg) => makeNestedLabel(agg, overallMaxLabel),
      subtype,
      params: [...params()],
      getFormat,
      getSerializedFormat,
    },
    {
      getInternalStartServices,
    }
  );
};
