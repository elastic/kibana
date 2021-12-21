/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';
import { IBucketAggConfig, BucketAggParam } from './bucket_agg_type';

export const termsAggFilter = [
  '!top_hits',
  '!percentiles',
  '!std_dev',
  '!derivative',
  '!moving_avg',
  '!serial_diff',
  '!cumulative_sum',
  '!avg_bucket',
  '!max_bucket',
  '!min_bucket',
  '!sum_bucket',
];

export const termsOrderAggParamDefinition: Partial<BucketAggParam<IBucketAggConfig>> = {
  name: 'orderAgg',
  type: 'agg',
  allowedAggs: termsAggFilter,
  default: null,
  makeAgg(termsAgg, state = { type: 'count' }) {
    state.schema = 'orderAgg';
    const orderAgg = termsAgg.aggConfigs.createAggConfig<IBucketAggConfig>(state, {
      addToAggConfigs: false,
    });
    orderAgg.id = termsAgg.id + '-orderAgg';

    return orderAgg;
  },
  write(agg, output, aggs) {
    const dir = agg.params.order.value;
    const order: Record<string, any> = (output.params.order = {});

    let orderAgg = agg.params.orderAgg || aggs!.getResponseAggById(agg.params.orderBy);

    // TODO: This works around an Elasticsearch bug the always casts terms agg scripts to strings
    // thus causing issues with filtering. This probably causes other issues since float might not
    // be able to contain the number on the elasticsearch side
    if (output.params.script) {
      output.params.value_type = agg.getField().type === 'number' ? 'float' : agg.getField().type;
    }

    if (agg.params.missingBucket && agg.params.field.type === 'string') {
      output.params.missing = '__missing__';
    }

    if (!orderAgg) {
      order[agg.params.orderBy || '_count'] = dir;
      return;
    }

    if (aggs?.hasTimeShifts() && Object.keys(aggs?.getTimeShifts()).length > 1 && aggs.timeRange) {
      const shift = orderAgg.getTimeShift();
      orderAgg = aggs.createAggConfig(
        {
          type: 'filtered_metric',
          id: orderAgg.id,
          params: {
            customBucket: aggs
              .createAggConfig(
                {
                  type: 'filter',
                  id: 'shift',
                  params: {
                    filter: {
                      language: 'lucene',
                      query: {
                        range: {
                          [aggs.timeFields![0]]: {
                            gte: moment(aggs.timeRange.from)
                              .subtract(shift || 0)
                              .toISOString(),
                            lte: moment(aggs.timeRange.to)
                              .subtract(shift || 0)
                              .toISOString(),
                          },
                        },
                      },
                    },
                  },
                },
                {
                  addToAggConfigs: false,
                }
              )
              .serialize(),
            customMetric: orderAgg.serialize(),
          },
          enabled: false,
        },
        {
          addToAggConfigs: false,
        }
      );
    }
    if (orderAgg.type.name === 'count') {
      order._count = dir;
      return;
    }

    const orderAggPath = orderAgg.getValueBucketPath();

    if (orderAgg.parentId && aggs) {
      orderAgg = aggs.byId(orderAgg.parentId);
    }

    output.subAggs = (output.subAggs || []).concat(orderAgg);
    order[orderAggPath] = dir;
  },
};
