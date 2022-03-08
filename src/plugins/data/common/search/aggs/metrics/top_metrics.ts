/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { i18n } from '@kbn/i18n';
import { aggTopMetricsFnName } from './top_metrics_fn';
import { IMetricAggConfig, MetricAggType } from './metric_agg_type';
import { METRIC_TYPES } from './metric_agg_types';
import { KBN_FIELD_TYPES } from '../../../../common';
import { BaseAggParams } from '../types';

export interface AggParamsTopMetrics extends BaseAggParams {
  field: string;
  sortField?: string;
  sortOrder?: 'desc' | 'asc';
  size?: number;
}

export const getTopMetricsMetricAgg = () => {
  return new MetricAggType({
    name: METRIC_TYPES.TOP_METRICS,
    expressionName: aggTopMetricsFnName,
    title: i18n.translate('data.search.aggs.metrics.topMetricsTitle', {
      defaultMessage: 'Top metrics',
    }),
    makeLabel(aggConfig) {
      const isDescOrder = aggConfig.getParam('sortOrder').value === 'desc';
      const size = aggConfig.getParam('size');
      const field = aggConfig.getParam('field');
      const sortField = aggConfig.getParam('sortField');

      if (isDescOrder) {
        if (size > 1) {
          return i18n.translate('data.search.aggs.metrics.topMetrics.descWithSizeLabel', {
            defaultMessage: `Last {size} "{fieldName}" values by "{sortField}"`,
            values: {
              size,
              fieldName: field?.displayName,
              sortField: sortField?.displayName ?? '_score',
            },
          });
        } else {
          return i18n.translate('data.search.aggs.metrics.topMetrics.descNoSizeLabel', {
            defaultMessage: `Last "{fieldName}" value by "{sortField}"`,
            values: {
              fieldName: field?.displayName,
              sortField: sortField?.displayName ?? '_score',
            },
          });
        }
      } else {
        if (size > 1) {
          return i18n.translate('data.search.aggs.metrics.topMetrics.ascWithSizeLabel', {
            defaultMessage: `First {size} "{fieldName}" values by "{sortField}"`,
            values: {
              size,
              fieldName: field?.displayName,
              sortField: sortField?.displayName ?? '_score',
            },
          });
        } else {
          return i18n.translate('data.search.aggs.metrics.topMetrics.ascNoSizeLabel', {
            defaultMessage: `First "{fieldName}" value by "{sortField}"`,
            values: {
              fieldName: field?.displayName,
              sortField: sortField?.displayName ?? '_score',
            },
          });
        }
      }
    },
    params: [
      {
        name: 'field',
        type: 'field',
        scriptable: false,
        filterFieldTypes: [
          KBN_FIELD_TYPES.STRING,
          KBN_FIELD_TYPES.IP,
          KBN_FIELD_TYPES.BOOLEAN,
          KBN_FIELD_TYPES.NUMBER,
          KBN_FIELD_TYPES.DATE,
        ],
        write(agg, output) {
          const field = agg.getParam('field');
          output.params.metrics = { field: field.name };
        },
      },
      {
        name: 'size',
        default: 1,
      },
      {
        name: 'sortField',
        type: 'field',
        scriptable: false,
        filterFieldTypes: [KBN_FIELD_TYPES.NUMBER, KBN_FIELD_TYPES.DATE],
        default(agg: IMetricAggConfig) {
          return agg.getIndexPattern().timeFieldName;
        },
        write: _.noop, // prevent default write, it is handled below
      },
      {
        name: 'sortOrder',
        type: 'optioned',
        default: 'desc',
        options: [
          {
            text: i18n.translate('data.search.aggs.metrics.topMetrics.descendingLabel', {
              defaultMessage: 'Descending',
            }),
            value: 'desc',
          },
          {
            text: i18n.translate('data.search.aggs.metrics.topMetrics.ascendingLabel', {
              defaultMessage: 'Ascending',
            }),
            value: 'asc',
          },
        ],
        write(agg, output) {
          const sortField = agg.params.sortField;
          const sortOrder = agg.params.sortOrder;

          if (sortField && sortOrder) {
            output.params.sort = {
              [sortField.name]: sortOrder.value,
            };
          } else {
            output.params.sort = '_score';
          }
        },
      },
    ],
    // override is needed to support top_metrics as an orderAgg of terms agg
    getValueBucketPath(agg) {
      const field = agg.getParam('field').name;
      return `${agg.id}[${field}]`;
    },
    getValue(agg, aggregate: Record<string, estypes.AggregationsTopMetricsAggregate | undefined>) {
      const metricFieldName = agg.getParam('field').name;
      const results = aggregate[agg.id]?.top.map((result) => result.metrics[metricFieldName]) ?? [];

      if (results.length === 0) return null;
      if (results.length === 1) return results[0];
      return results;
    },
  });
};
