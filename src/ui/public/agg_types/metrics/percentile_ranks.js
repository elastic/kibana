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

import valuesEditor from '../controls/percentile_ranks.html';
import '../../number_list';
import { MetricAggType } from './metric_agg_type';
import { getResponseAggConfigClass } from './get_response_agg_config_class';
import { fieldFormats } from '../../registry/field_formats';
import { getPercentileValue } from './percentiles_get_value';


// required by the values editor

const valueProps = {
  makeLabel: function () {
    const field = this.getField();
    const format = (field && field.format) || fieldFormats.getDefaultInstance('number');
    const label = this.params.customLabel || this.getFieldDisplayName();

    return 'Percentile rank ' + format.convert(this.key, 'text') + ' of "' + label + '"';
  }
};

export const percentileRanksMetricAgg = new MetricAggType({
  name: 'percentile_ranks',
  title: 'Percentile Ranks',
  makeLabel: function (agg) {
    return 'Percentile ranks of ' + agg.getFieldDisplayName();
  },
  params: [
    {
      name: 'field',
      filterFieldTypes: 'number'
    },
    {
      name: 'values',
      editor: valuesEditor,
      default: []
    },
    {
      write(agg, output) {
        output.params.keyed = false;
      }
    }
  ],
  getResponseAggs: function (agg) {
    const ValueAggConfig = getResponseAggConfigClass(agg, valueProps);

    return agg.params.values.map(function (value) {
      return new ValueAggConfig(value);
    });
  },
  getFormat: function () {
    return fieldFormats.getInstance('percent') || fieldFormats.getDefaultInstance('number');
  },
  getValue: function (agg, bucket) {
    return getPercentileValue(agg, bucket) / 100;
  }
});
