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
import { parentPipelineAggHelper } from './lib/parent_pipeline_agg_helper';
import { makeNestedLabel } from './lib/make_nested_label';
import { METRIC_TYPES } from './metric_agg_types';

const cumulativeSumLabel = i18n.translate('common.ui.aggTypes.metrics.cumulativeSumLabel', {
  defaultMessage: 'cumulative sum',
});

const cumulativeSumTitle = i18n.translate('common.ui.aggTypes.metrics.cumulativeSumTitle', {
  defaultMessage: 'Cumulative Sum',
});

export const cumulativeSumMetricAgg = new MetricAggType({
  name: METRIC_TYPES.CUMULATIVE_SUM,
  title: cumulativeSumTitle,
  subtype: parentPipelineAggHelper.subtype,
  makeLabel: agg => makeNestedLabel(agg, cumulativeSumLabel),
  params: [...parentPipelineAggHelper.params()],
  getFormat: parentPipelineAggHelper.getFormat,
});
