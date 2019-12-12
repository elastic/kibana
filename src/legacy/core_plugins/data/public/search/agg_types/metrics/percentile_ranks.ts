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
import { npStart } from 'ui/new_platform';
import { PercentileRanksEditor } from 'ui/vis/editors/default/controls/percentile_ranks';
import { MetricAggType } from './metric_agg_type';
import { getResponseAggConfigClass, IResponseAggConfig } from './lib/get_response_agg_config_class';

import { getPercentileValue } from './percentiles_get_value';
import { METRIC_TYPES } from './metric_agg_types';
import { FIELD_FORMAT_IDS, KBN_FIELD_TYPES } from '../../../../../../../plugins/data/public';

// required by the values editor

export type IPercentileRanksAggConfig = IResponseAggConfig;

const getFieldFormats = () => npStart.plugins.data.fieldFormats;

const valueProps = {
  makeLabel(this: IPercentileRanksAggConfig) {
    const fieldFormats = getFieldFormats();
    const field = this.getField();
    const format =
      (field && field.format) || fieldFormats.getDefaultInstance(KBN_FIELD_TYPES.NUMBER);
    const customLabel = this.getParam('customLabel');
    const label = customLabel || this.getFieldDisplayName();

    return i18n.translate('common.ui.aggTypes.metrics.percentileRanks.valuePropsLabel', {
      defaultMessage: 'Percentile rank {format} of "{label}"',
      values: { format: format.convert(this.key, 'text'), label },
    });
  },
};

export const percentileRanksMetricAgg = new MetricAggType<IPercentileRanksAggConfig>({
  name: METRIC_TYPES.PERCENTILE_RANKS,
  title: i18n.translate('common.ui.aggTypes.metrics.percentileRanksTitle', {
    defaultMessage: 'Percentile Ranks',
  }),
  makeLabel(agg) {
    return i18n.translate('common.ui.aggTypes.metrics.percentileRanksLabel', {
      defaultMessage: 'Percentile ranks of {field}',
      values: { field: agg.getFieldDisplayName() },
    });
  },
  params: [
    {
      name: 'field',
      type: 'field',
      filterFieldTypes: KBN_FIELD_TYPES.NUMBER,
    },
    {
      name: 'values',
      editorComponent: PercentileRanksEditor,
      default: [],
    },
    {
      write(agg, output) {
        output.params.keyed = false;
      },
    },
  ],
  getResponseAggs(agg) {
    const ValueAggConfig = getResponseAggConfigClass(agg, valueProps);
    const values = agg.getParam('values');

    return values.map((value: any) => new ValueAggConfig(value));
  },
  getFormat() {
    const fieldFormats = getFieldFormats();
    return (
      fieldFormats.getInstance(FIELD_FORMAT_IDS.PERCENT) ||
      fieldFormats.getDefaultInstance(KBN_FIELD_TYPES.NUMBER)
    );
  },
  getValue(agg, bucket) {
    return getPercentileValue(agg, bucket) / 100;
  },
});
