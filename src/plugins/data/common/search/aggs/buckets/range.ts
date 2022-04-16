/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

import { NumericalRange, numericalRangeToAst } from '../../expressions';
import { KBN_FIELD_TYPES } from '../../..';
import { AggTypesDependencies } from '../agg_types';
import { BaseAggParams } from '../types';

import { BucketAggType } from './bucket_agg_type';
import { aggRangeFnName } from './range_fn';
import { RangeKey } from './range_key';
import { createFilterRange } from './create_filter/range';
import { BUCKET_TYPES } from './bucket_agg_types';

const rangeTitle = i18n.translate('data.search.aggs.buckets.rangeTitle', {
  defaultMessage: 'Range',
});

export interface RangeBucketAggDependencies {
  getFieldFormatsStart: AggTypesDependencies['getFieldFormatsStart'];
}

export interface AggParamsRange extends BaseAggParams {
  field: string;
  ranges?: NumericalRange[];
}

export const getRangeBucketAgg = ({ getFieldFormatsStart }: RangeBucketAggDependencies) => {
  const keyCaches = new WeakMap();

  return new BucketAggType({
    name: BUCKET_TYPES.RANGE,
    expressionName: aggRangeFnName,
    title: rangeTitle,
    createFilter: createFilterRange(getFieldFormatsStart),
    makeLabel(aggConfig) {
      return i18n.translate('data.search.aggs.aggTypesLabel', {
        defaultMessage: '{fieldName} ranges',
        values: {
          fieldName: aggConfig.getFieldDisplayName(),
        },
      });
    },
    getKey(bucket, key, agg) {
      let keys = keyCaches.get(agg);

      if (!keys) {
        keys = new Map();
        keyCaches.set(agg, keys);
      }

      const id = RangeKey.idBucket(bucket);

      key = keys.get(id);
      if (!key) {
        key = new RangeKey(bucket, agg.params.ranges);
        keys.set(id, key);
      }

      return key;
    },
    getSerializedFormat(agg) {
      const format = agg.params.field
        ? agg.aggConfigs.indexPattern.getFormatterForField(agg.params.field).toJSON()
        : { id: undefined, params: undefined };
      return {
        id: 'range',
        params: {
          id: format.id,
          params: format.params,
        },
      };
    },
    params: [
      {
        name: 'field',
        type: 'field',
        // number_range is not supported by Elasticsearch
        filterFieldTypes: [KBN_FIELD_TYPES.NUMBER],
      },
      {
        name: 'ranges',
        default: [
          { from: 0, to: 1000 },
          { from: 1000, to: 2000 },
        ],
        write(aggConfig, output) {
          output.params.ranges = (aggConfig.params as AggParamsRange).ranges?.map((range) => ({
            to: range.to,
            from: range.from,
          }));

          output.params.keyed = true;
        },
        toExpressionAst: (ranges) => ranges?.map(numericalRangeToAst),
      },
    ],
  });
};
