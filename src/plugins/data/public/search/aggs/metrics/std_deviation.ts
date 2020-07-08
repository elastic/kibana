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
import { i18n } from '@kbn/i18n';
import { MetricAggType } from './metric_agg_type';
import { METRIC_TYPES } from './metric_agg_types';
import { getResponseAggConfigClass, IResponseAggConfig } from './lib/get_response_agg_config_class';
import { KBN_FIELD_TYPES } from '../../../../common';
import { BaseAggParams } from '../types';

export interface AggParamsStdDeviation extends BaseAggParams {
  field: string;
}

interface ValProp {
  valProp: string[];
  title: string;
}

export interface IStdDevAggConfig extends IResponseAggConfig {
  keyedDetails: (customLabel: string, fieldDisplayName?: string) => Record<string, ValProp>;
  valProp: () => string[];
}

const responseAggConfigProps = {
  valProp(this: IStdDevAggConfig) {
    const customLabel = this.getParam('customLabel');
    const details = this.keyedDetails(customLabel)[this.key];

    return details.valProp;
  },
  makeLabel(this: IStdDevAggConfig) {
    const fieldDisplayName = this.getFieldDisplayName();
    const customLabel = this.getParam('customLabel');
    const details = this.keyedDetails(customLabel, fieldDisplayName);

    return get(details, [this.key, 'title']);
  },
  keyedDetails(this: IStdDevAggConfig, customLabel: string, fieldDisplayName: string) {
    const label =
      customLabel ||
      i18n.translate('data.search.aggs.metrics.standardDeviation.keyDetailsLabel', {
        defaultMessage: 'Standard Deviation of {fieldDisplayName}',
        values: { fieldDisplayName },
      });

    return {
      std_lower: {
        valProp: ['std_deviation_bounds', 'lower'],
        title: i18n.translate('data.search.aggs.metrics.standardDeviation.lowerKeyDetailsTitle', {
          defaultMessage: 'Lower {label}',
          values: { label },
        }),
      },
      std_upper: {
        valProp: ['std_deviation_bounds', 'upper'],
        title: i18n.translate('data.search.aggs.metrics.standardDeviation.upperKeyDetailsTitle', {
          defaultMessage: 'Upper {label}',
          values: { label },
        }),
      },
    };
  },
};

export const getStdDeviationMetricAgg = () => {
  return new MetricAggType<IStdDevAggConfig>({
    name: METRIC_TYPES.STD_DEV,
    dslName: 'extended_stats',
    title: i18n.translate('data.search.aggs.metrics.standardDeviationTitle', {
      defaultMessage: 'Standard Deviation',
    }),
    makeLabel(agg) {
      return i18n.translate('data.search.aggs.metrics.standardDeviationLabel', {
        defaultMessage: 'Standard Deviation of {field}',
        values: { field: agg.getFieldDisplayName() },
      });
    },
    params: [
      {
        name: 'field',
        type: 'field',
        filterFieldTypes: KBN_FIELD_TYPES.NUMBER,
      },
    ],

    getResponseAggs(agg) {
      const ValueAggConfig = getResponseAggConfigClass(agg, responseAggConfigProps);

      return [new ValueAggConfig('std_lower'), new ValueAggConfig('std_upper')];
    },

    getValue(agg, bucket) {
      return get(bucket[agg.parentId], agg.valProp());
    },
  });
};
