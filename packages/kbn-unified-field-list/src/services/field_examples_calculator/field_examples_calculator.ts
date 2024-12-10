/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Adapted from src/plugins/discover/public/application/main/components/sidebar/lib/field_calculator.js

import { map, sortBy, defaults, isObject, pick } from 'lodash';
import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import { flattenHit } from '@kbn/data-service/src/search/tabify';
import { FieldFormat } from '@kbn/field-formats-plugin/common';
import { canProvideExamplesForField } from '../../utils/can_provide_stats';
import { DEFAULT_SIMPLE_EXAMPLES_SIZE } from '../../constants';

type FieldHitValue = any;

export interface FieldValueCountsParams {
  values: FieldHitValue[];
  field: DataViewField;
  count?: number;
  isEsqlQuery: boolean;
}

export function getFieldExampleBuckets(params: FieldValueCountsParams, formatter?: FieldFormat) {
  params = defaults(params, {
    count: DEFAULT_SIMPLE_EXAMPLES_SIZE,
  });

  if (!canProvideExamplesForField(params.field, params.isEsqlQuery)) {
    throw new Error(
      `Analysis is not available this field type: "${params.field.type}". Field name: "${params.field.name}"`
    );
  }

  const records = params.values;

  const { groups, sampledValues } = groupValues(records, formatter);
  const buckets = sortBy(groups, ['count', 'order'])
    .reverse()
    .slice(0, params.count)
    .map((bucket) => pick(bucket, ['key', 'count']));

  return {
    buckets,
    sampledValues,
    sampledDocuments: params.values.length,
  };
}

export function getFieldValues(
  hits: estypes.SearchHit[],
  field: DataViewField,
  dataView: DataView
): FieldHitValue[] {
  if (!field?.name) {
    return [];
  }
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

      if (Object.hasOwn(groups, value)) {
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
