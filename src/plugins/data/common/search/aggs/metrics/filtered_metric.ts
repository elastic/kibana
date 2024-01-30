/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { buildEsQuery, buildQueryFilter } from '@kbn/es-query';
import { getEsQueryConfig } from '../../..';
import { MetricAggType } from './metric_agg_type';
import { makeNestedLabel } from './lib/make_nested_label';
import { siblingPipelineAggHelper } from './lib/sibling_pipeline_agg_helper';
import { METRIC_TYPES } from './metric_agg_types';
import { AggConfigSerialized, BaseAggParams, IAggConfig } from '../types';
import { aggFilteredMetricFnName } from './filtered_metric_fn';

export interface AggParamsFilteredMetricSerialized extends BaseAggParams {
  customMetric?: AggConfigSerialized;
  customBucket?: AggConfigSerialized;
}

export interface AggParamsFilteredMetric extends BaseAggParams {
  customMetric?: IAggConfig;
  customBucket?: IAggConfig;
}

const filteredMetricLabel = i18n.translate('data.search.aggs.metrics.filteredMetricLabel', {
  defaultMessage: 'filtered',
});

const filteredMetricTitle = i18n.translate('data.search.aggs.metrics.filteredMetricTitle', {
  defaultMessage: 'Filtered metric',
});

export interface FiltersMetricAggDependencies {
  getConfig: <T = unknown>(key: string) => T;
}

export const getFilteredMetricAgg = ({ getConfig }: FiltersMetricAggDependencies) => {
  const { subtype, params, getSerializedFormat } = siblingPipelineAggHelper;

  return new MetricAggType({
    name: METRIC_TYPES.FILTERED_METRIC,
    expressionName: aggFilteredMetricFnName,
    title: filteredMetricTitle,
    makeLabel: (agg) => makeNestedLabel(agg, filteredMetricLabel),
    subtype,
    params: [...params(['filter'])],
    hasNoDslParams: true,
    getSerializedFormat,
    createFilter: (agg, inputState) => {
      const indexPattern = agg.getIndexPattern();
      if (
        agg.params.customMetric.type.name === 'top_hits' ||
        agg.params.customMetric.type.name === 'top_metrics'
      ) {
        return agg.params.customMetric.createFilter(inputState);
      }
      if (!agg.params.customBucket.params.filter) return;
      const esQueryConfigs = getEsQueryConfig({ get: getConfig });
      return buildQueryFilter(
        buildEsQuery(indexPattern, [agg.params.customBucket.params.filter], [], esQueryConfigs),
        indexPattern.id!,
        agg.params.customBucket.params.filter.query
      );
    },
    getValue(agg, bucket) {
      const customMetric = agg.getParam('customMetric');
      const customBucket = agg.getParam('customBucket');
      return bucket && bucket[customBucket.id] && customMetric.getValue(bucket[customBucket.id]);
    },
    getValueType(agg) {
      const customMetric = agg.getParam('customMetric');
      return (
        customMetric.type.getValueType?.(customMetric) ||
        customMetric.params.field?.type ||
        'number'
      );
    },
    getValueBucketPath(agg) {
      const customBucket = agg.getParam('customBucket');
      const customMetric = agg.getParam('customMetric');
      if (customMetric.type.name === 'count') {
        return customBucket.getValueBucketPath();
      }
      return `${customBucket.getValueBucketPath()}>${customMetric.getValueBucketPath()}`;
    },
    getResponseId(agg) {
      return agg.params.customBucket.id;
    },
  });
};
