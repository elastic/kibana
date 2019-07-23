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
import { MetricAggType } from './metric_agg_type';
import { getResponseAggConfigClass } from './get_response_agg_config_class';
import { i18n } from '@kbn/i18n';

const responseAggConfigProps = {
  valProp: function () {
    const details = this.keyedDetails(this.params.customLabel)[this.key];
    return details.valProp;
  },
  makeLabel: function () {
    const fieldDisplayName = this.getFieldDisplayName();
    const details = this.keyedDetails(this.params.customLabel, fieldDisplayName);
    return _.get(details, [this.key, 'title']);
  },
  keyedDetails: function (customLabel, fieldDisplayName) {
    const label = customLabel ? customLabel : i18n.translate('common.ui.aggTypes.metrics.standardDeviation.keyDetailsLabel', {
      defaultMessage: 'Standard Deviation of {fieldDisplayName}',
      values: { fieldDisplayName }
    });
    return {
      std_lower: {
        valProp: ['std_deviation_bounds', 'lower'],
        title: i18n.translate('common.ui.aggTypes.metrics.standardDeviation.lowerKeyDetailsTitle', {
          defaultMessage: 'Lower {label}',
          values: { label }
        })
      },
      std_upper: {
        valProp: ['std_deviation_bounds', 'upper'],
        title: i18n.translate('common.ui.aggTypes.metrics.standardDeviation.upperKeyDetailsTitle', {
          defaultMessage: 'Upper {label}',
          values: { label }
        })
      }
    };
  }
};

export const stdDeviationMetricAgg = new MetricAggType({
  name: 'std_dev',
  dslName: 'extended_stats',
  title: i18n.translate('common.ui.aggTypes.metrics.standardDeviationTitle', {
    defaultMessage: 'Standard Deviation'
  }),
  makeLabel: function (agg) {
    return i18n.translate('common.ui.aggTypes.metrics.standardDeviationLabel', {
      defaultMessage: 'Standard Deviation of {field}',
      values: { field: agg.getFieldDisplayName() }
    });
  },
  params: [
    {
      name: 'field',
      type: 'field',
      filterFieldTypes: 'number'
    }
  ],

  getResponseAggs: function (agg) {
    const ValueAggConfig = getResponseAggConfigClass(agg, responseAggConfigProps);

    return [
      new ValueAggConfig('std_lower'),
      new ValueAggConfig('std_upper')
    ];
  },

  getValue: function (agg, bucket) {
    return _.get(bucket[agg.parentId], agg.valProp());
  }
});
