/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// Adapted from src/plugins/discover/public/application/main/components/sidebar/lib/field_calculator.js

import { map, sortBy, defaults, isObject, pick } from 'lodash';
import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { DataView, DataViewField } from '@kbn/data-plugin/common';
import { flattenHit } from '@kbn/data-plugin/common';
import { FieldFormat } from '@kbn/field-formats-plugin/common';

type FieldHitValue = any;

interface FieldValueCountsParams {
  hits: estypes.SearchHit[];
  dataView: DataView;
  field: DataViewField;
  count?: number;
}

export const canProvideExamplesForField = (field: DataViewField): boolean => {
  if (field.name === '_score') {
    return false;
  }
  return [
    'string',
    'text',
    'keyword',
    'version',
    'ip',
    'number',
    'geo_point',
    'geo_shape',
  ].includes(field.type);
};

export const showExamplesForField = (field: DataViewField): boolean => {
  return (
    (!field.aggregatable && canProvideExamplesForField(field)) ||
    field.type === 'geo_point' ||
    field.type === 'geo_shape'
  );
};

export function getFieldExampleBuckets(params: FieldValueCountsParams, formatter?: FieldFormat) {
  params = defaults(params, {
    count: 5,
  });

  if (!canProvideExamplesForField(params.field)) {
    throw new Error(
      `Analysis is not available this field type: "${params.field.type}". Field name: "${params.field.name}"`
    );
  }

  const records = getFieldValues(params.hits, params.field, params.dataView);

  const { groups, sampledValues } = groupValues(records, formatter);
  const buckets = sortBy(groups, ['count', 'order'])
    .reverse()
    .slice(0, params.count)
    .map((bucket) => pick(bucket, ['key', 'count']));

  return {
    buckets,
    sampledValues,
    sampledDocuments: params.hits.length,
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

export function groupValues(
  records: FieldHitValue[],
  formatter?: FieldFormat
): {
  groups: Record<string, { count: number; key: any; order: number }>;
  sampledValues: number;
} {
  const groups: Record<string, { count: number; key: any; order: number }> = {};
  let sampledValues = 0; // counts in each value's occurrence but only once per a record

  records.forEach(function (recordValues) {
    if (isObject(recordValues) && !Array.isArray(recordValues)) {
      throw new Error('Analysis is not available for object fields.');
    }

    let order = 0; // will be used for ordering terms with the same 'count'
    let values: any[];
    const visitedValuesMap: Record<string, boolean> = {};

    if (Array.isArray(recordValues)) {
      values = recordValues;
    } else {
      values = recordValues == null ? [] : [recordValues];
    }

    values.forEach((v) => {
      const value = formatter ? formatter.convert(v) : v;

      if (visitedValuesMap[value]) {
        // already counted in groups
        return;
      }

      if (groups.hasOwnProperty(value)) {
        groups[value].count++;
      } else {
        groups[value] = {
          key: value,
          count: 1,
          order: order++,
        };
      }
      visitedValuesMap[value] = true;
      sampledValues++;
    });
  });

  return {
    groups,
    sampledValues,
  };
}
