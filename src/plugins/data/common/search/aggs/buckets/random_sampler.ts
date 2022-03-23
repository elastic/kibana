/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { BucketAggType } from './bucket_agg_type';
import { BaseAggParams } from '../types';
import { aggRandomSamplerFnName } from './random_sampler_fn';
import { TimeBuckets } from './lib/time_buckets';
import { UI_SETTINGS } from '../../../constants';
import { updateTimeBuckets } from './date_histogram';
import { AggTypesDependencies } from '../agg_types';

export const RANDOM_SAMPLER_AGG_NAME = 'random_sampler';

const title = i18n.translate('data.search.aggs.buckets.samplerTitle', {
  defaultMessage: 'Random sampler',
  description: 'Random sampler aggregation title',
});

export interface AggParamsRandomSampler extends BaseAggParams {
  probability?: number;
}

/**
 * A filtering aggregation used to limit any sub aggregations' processing to a sample of the top-scoring documents.
 */
export const getRandomSamplerBucketAgg = (deps: AggTypesDependencies) => {
  if (!deps) {
    return new BucketAggType({
      name: RANDOM_SAMPLER_AGG_NAME,
      title,
      customLabels: false,
      expressionName: aggRandomSamplerFnName,
      params: [
        {
          name: 'probability',
          type: 'number',
        },
        {
          name: 'aggs',
          type: 'schema',
        },
      ],
    });
  }
  const { calculateBounds, getConfig } = deps;

  return new BucketAggType({
    name: RANDOM_SAMPLER_AGG_NAME,
    title,
    customLabels: false,
    expressionName: aggRandomSamplerFnName,
    params: [
      {
        name: 'probability',
        type: 'number',
      },
      {
        name: 'aggs',
        type: 'schema',
      },
    ],
    decorateAggConfig() {
      let buckets: any;

      return {
        buckets: {
          configurable: true,
          get() {
            if (buckets) return buckets;

            buckets = new TimeBuckets({
              'histogram:maxBars': getConfig(UI_SETTINGS.HISTOGRAM_MAX_BARS),
              'histogram:barTarget': getConfig(UI_SETTINGS.HISTOGRAM_BAR_TARGET),
              dateFormat: getConfig('dateFormat'),
              'dateFormat:scaled': getConfig('dateFormat:scaled'),
            });
            updateTimeBuckets(this, calculateBounds, buckets);

            return buckets;
          },
        } as any,
      };
    },
  });
};
