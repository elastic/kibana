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
import { AggType, AggTypeConfig } from '../agg_type';
import { AggParamType } from '../param_types/agg';
import { AggConfig } from '../agg_config';
import { METRIC_TYPES } from './metric_agg_types';
import { KBN_FIELD_TYPES } from '../../../../../../../plugins/data/public';

export interface IMetricAggConfig extends AggConfig {
  type: InstanceType<typeof MetricAggType>;
}

export interface MetricAggParam<TMetricAggConfig extends AggConfig>
  extends AggParamType<TMetricAggConfig> {
  filterFieldTypes?: KBN_FIELD_TYPES | KBN_FIELD_TYPES[] | '*';
  onlyAggregatable?: boolean;
}

const metricType = 'metrics';

interface MetricAggTypeConfig<TMetricAggConfig extends AggConfig>
  extends AggTypeConfig<TMetricAggConfig, MetricAggParam<TMetricAggConfig>> {
  isScalable?: () => boolean;
  subtype?: string;
}

export class MetricAggType<TMetricAggConfig extends AggConfig = IMetricAggConfig> extends AggType<
  TMetricAggConfig,
  MetricAggParam<TMetricAggConfig>
> {
  subtype: string;
  isScalable: () => boolean;
  type = metricType;

  getKey = () => {};

  constructor(config: MetricAggTypeConfig<TMetricAggConfig>) {
    super(config);

    this.getValue =
      config.getValue ||
      ((agg, bucket) => {
        // Metric types where an empty set equals `zero`
        const isSettableToZero = [METRIC_TYPES.CARDINALITY, METRIC_TYPES.SUM].includes(
          agg.type.name as METRIC_TYPES
        );

        // Return proper values when no buckets are present
        // `Count` handles empty sets properly
        if (!bucket[agg.id] && isSettableToZero) return 0;

        return bucket[agg.id] && bucket[agg.id].value;
      });

    this.getFormat =
      config.getFormat ||
      (agg => {
        const registeredFormats = npStart.plugins.data.fieldFormats;
        const field = agg.getField();
        return field ? field.format : registeredFormats.getDefaultInstance(KBN_FIELD_TYPES.NUMBER);
      });

    this.subtype =
      config.subtype ||
      i18n.translate('common.ui.aggTypes.metrics.metricAggregationsSubtypeTitle', {
        defaultMessage: 'Metric Aggregations',
      });

    this.isScalable = config.isScalable || (() => false);
  }
}

export function isMetricAggType(aggConfig: any): aggConfig is MetricAggType {
  return aggConfig && aggConfig.type === metricType;
}
