/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// Adapted from src/plugins/discover/public/application/main/components/sidebar/lib/field_calculator.js

import { map, sortBy, without, each, defaults, isObject } from 'lodash';
import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { DataView, DataViewField } from '@kbn/data-plugin/common';
import { flattenHit } from '@kbn/data-plugin/common';

type FieldHitValue = any;

interface FieldValueCountsParams {
  hits: estypes.SearchHit[];
  dataView: DataView;
  field: DataViewField;
  grouped?: boolean;
  count?: number;
}

export function getFieldExampleBuckets(params: FieldValueCountsParams) {
  params = defaults(params, {
    count: 5,
    grouped: false,
  });

  if (
    params.field.type === 'geo_point' ||
    params.field.type === 'geo_shape' ||
    params.field.type === 'attachment' ||
    params.field.type === 'unknown'
  ) {
    throw new Error('Analysis is not available this field type');
  }

  const allValues = getFieldValues(params.hits, params.field, params.dataView);
  const missing = countMissing(allValues);

  const { groups, valuesCount } = groupValues(allValues, params);
  const exampleBuckets = map(
    sortBy(groups, 'count').reverse().slice(0, params.count),
    function (bucket) {
      return {
        key: bucket.value,
        count: bucket.count,
      };
    }
  );

  if (params.hits.length - missing === 0) {
    throw new Error('No data for this field in the first found records');
  }

  return {
    total: params.hits.length,
    exists: params.hits.length - missing,
    missing,
    valuesCount,
    buckets: exampleBuckets,
  };
}

export function getFieldValues(
  hits: estypes.SearchHit[],
  field: DataViewField,
  dataView: DataView
): FieldHitValue[] {
  return map(hits, function (hit) {
    return flattenHit(hit, dataView, { includeIgnoredValues: true })[field.name];
  });
}

// returns a count of fields in the array that are undefined or null
export function countMissing(array: FieldHitValue[]): number {
  return array.length - without(array, undefined, null).length;
}

export function groupValues(
  allValues: FieldHitValue[],
  params: FieldValueCountsParams
): { groups: Record<string, { count: number; value: any }>; valuesCount: number } {
  const groups: Record<string, { count: number; value: any }> = {};
  let k;

  allValues.forEach(function (value) {
    if (isObject(value) && !Array.isArray(value)) {
      throw new Error('Analysis is not available for object fields.');
    }

    if (Array.isArray(value) && !params.grouped) {
      k = value;
    } else {
      k = value == null ? undefined : [value];
    }

    each(k, function (key) {
      if (groups.hasOwnProperty(key)) {
        groups[key].count++;
      } else {
        groups[key] = {
          value: params.grouped ? value : key,
          count: 1,
        };
      }
    });
  });

  return {
    groups,
    valuesCount: Object.values(groups).reduce((sum, group) => sum + group.count, 0),
  };
}
