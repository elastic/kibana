/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { cloneDeep } from 'lodash';
import { i18n } from '@kbn/i18n';
import { buildEsQuery, Query } from '@kbn/es-query';

import moment from 'moment';
import { GeoBoundingBox, QueryFilter, geoBoundingBoxToAst, queryToAst } from '../../expressions';
import { BucketAggType } from './bucket_agg_type';
import { BUCKET_TYPES } from './bucket_agg_types';
import { aggFilterFnName } from './filter_fn';
import { BaseAggParams } from '../types';
import { getEsQueryConfig } from '../../../es_query';
import { parseInterval } from '../utils';
import { CalculateBoundsFn } from '.';

const filterTitle = i18n.translate('data.search.aggs.buckets.filterTitle', {
  defaultMessage: 'Filter',
});

export interface AggParamsFilter extends BaseAggParams {
  geo_bounding_box?: GeoBoundingBox;
  filter?: QueryFilter;
  timeWindow?: string;
}

export const getFilterBucketAgg = ({
  getConfig,
  calculateBounds,
}: {
  getConfig: <T = any>(key: string) => T;
  calculateBounds: CalculateBoundsFn;
}) =>
  new BucketAggType({
    name: BUCKET_TYPES.FILTER,
    expressionName: aggFilterFnName,
    title: filterTitle,
    makeLabel: () => filterTitle,
    params: [
      {
        name: 'geo_bounding_box',
        toExpressionAst: geoBoundingBoxToAst,
      },
      {
        name: 'timeShift',
        type: 'string',
        write: () => {},
      },
      {
        name: 'timeWindow',
        write: () => {},
      },
      {
        name: 'filter',
        write(aggConfig, output, aggConfigs) {
          const filter: Query = aggConfig.params.filter;
          const timeWindow: string | undefined = aggConfig.params.timeWindow;

          const input = cloneDeep(filter);

          if (!input && !timeWindow) {
            return;
          }

          if (!aggConfigs) {
            return;
          }

          let query: object | undefined;

          if (input) {
            const esQueryConfigs = getEsQueryConfig({ get: getConfig });
            query = buildEsQuery(aggConfig.getIndexPattern(), [input], [], esQueryConfigs);

            if (!query) {
              console.log('malformed filter agg params, missing "query" on input'); // eslint-disable-line no-console
              return;
            }
          }

          const timeRangeAnchor = aggConfigs.timeRange
            ? moment(calculateBounds(aggConfigs.timeRange).max)
            : undefined;

          output.params =
            !timeWindow || !timeRangeAnchor || !aggConfig.getIndexPattern().timeFieldName
              ? query
              : {
                  bool: {
                    filter: [
                      {
                        range: {
                          [aggConfig.getIndexPattern().timeFieldName!]: {
                            format: 'strict_date_optional_time',
                            gte: timeRangeAnchor
                              .clone()
                              .subtract(parseInterval(timeWindow))
                              .subtract(aggConfig.getTimeShift())
                              .toISOString(),
                            lte: timeRangeAnchor
                              .clone()
                              .subtract(aggConfig.getTimeShift())
                              .toISOString(),
                          },
                        },
                      },
                      query ? query : undefined,
                    ].filter(Boolean),
                  },
                };
        },
        toExpressionAst: queryToAst,
      },
    ],
  });
