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
import { METRIC_TYPES } from './metric_agg_types';
import { KBN_FIELD_TYPES } from '../../../../../plugins/data/common';

const geoCentroidTitle = i18n.translate('common.ui.aggTypes.metrics.geoCentroidTitle', {
  defaultMessage: 'Geo Centroid',
});

const geoCentroidLabel = i18n.translate('common.ui.aggTypes.metrics.geoCentroidLabel', {
  defaultMessage: 'Geo Centroid',
});

export const geoCentroidMetricAgg = new MetricAggType({
  name: METRIC_TYPES.GEO_CENTROID,
  title: geoCentroidTitle,
  makeLabel: () => geoCentroidLabel,
  params: [
    {
      name: 'field',
      type: 'field',
      filterFieldTypes: KBN_FIELD_TYPES.GEO_POINT,
    },
  ],
  getValue(agg, bucket) {
    return bucket[agg.id] && bucket[agg.id].location;
  },
});
