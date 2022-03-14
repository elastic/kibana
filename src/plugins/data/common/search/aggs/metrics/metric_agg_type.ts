/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { AggType, AggTypeConfig } from '../agg_type';
import { AggParamType } from '../param_types/agg';
import { AggConfig } from '../agg_config';
import { METRIC_TYPES } from './metric_agg_types';
import { BaseParamType, FieldTypes } from '../param_types';
import { AggGroupNames } from '../agg_groups';

export interface IMetricAggConfig extends AggConfig {
  type: InstanceType<typeof MetricAggType>;
}

export interface MetricAggParam<TMetricAggConfig extends AggConfig>
  extends AggParamType<TMetricAggConfig> {
  filterFieldTypes?: FieldTypes;
  onlyAggregatable?: boolean;
  scriptable?: boolean;
}

const metricType = 'metrics';

interface MetricAggTypeConfig<TMetricAggConfig extends AggConfig>
  extends AggTypeConfig<TMetricAggConfig, MetricAggParam<TMetricAggConfig>> {
  isScalable?: () => boolean;
  subtype?: string;
}

// TODO need to make a more explicit interface for this
export type IMetricAggType = MetricAggType;

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

    this.params.push(
      new BaseParamType({
        name: 'timeShift',
        type: 'string',
        write: () => {},
      }) as MetricAggParam<TMetricAggConfig>
    );

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

    this.subtype =
      config.subtype ||
      i18n.translate('data.search.aggs.metrics.metricAggregationsSubtypeTitle', {
        defaultMessage: 'Metric Aggregations',
      });

    this.isScalable = config.isScalable || (() => false);

    // split at this point if there are time shifts and this is the first metric
    this.splitForTimeShift = (agg, aggs) =>
      aggs.hasTimeShifts() &&
      aggs.byType(AggGroupNames.Metrics)[0] === agg &&
      !aggs
        .byType(AggGroupNames.Buckets)
        .some((bucketAgg) => bucketAgg.type.splitForTimeShift(bucketAgg, aggs));
  }
}

export function isMetricAggType(aggConfig: any): aggConfig is MetricAggType {
  return aggConfig && aggConfig.type === metricType;
}
