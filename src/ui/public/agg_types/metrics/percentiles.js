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

import { ordinalSuffix } from '../../utils/ordinal_suffix';
import percentsEditor from '../controls/percentiles.html';
import '../../number_list';
import { MetricAggType } from './metric_agg_type';
import { getResponseAggConfigClass } from './get_response_agg_config_class';
import { getPercentileValue } from './percentiles_get_value';
import { i18n } from '@kbn/i18n';

const valueProps = {
  makeLabel: function () {
    const label = this.params.customLabel || this.getFieldDisplayName();
    return i18n.translate('common.ui.aggTypes.metrics.percentiles.valuePropsLabel', {
      defaultMessage: '{percentile} percentile of {label}',
      values: { percentile: ordinalSuffix(this.key), label }
    });
  }
};

export const percentilesMetricAgg = new MetricAggType({
  name: 'percentiles',
  title: i18n.translate('common.ui.aggTypes.metrics.percentilesTitle', {
    defaultMessage: 'Percentiles'
  }),
  makeLabel: function (agg) {
    return i18n.translate('common.ui.aggTypes.metrics.percentilesLabel', {
      defaultMessage: 'Percentiles of {field}',
      values: { field: agg.getFieldDisplayName() }
    });
  },
  params: [
    {
      name: 'field',
      type: 'field',
      filterFieldTypes: 'number'
    },
    {
      name: 'percents',
      editor: percentsEditor,
      default: [1, 5, 25, 50, 75, 95, 99]
    },
    {
      write(agg, output) {
        output.params.keyed = false;
      }
    }
  ],
  getResponseAggs: function (agg) {
    const ValueAggConfig = getResponseAggConfigClass(agg, valueProps);

    return agg.params.percents.map(function (percent) {
      return new ValueAggConfig(percent);
    });
  },
  getValue: getPercentileValue
});
