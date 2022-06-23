/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataView, DataViewField } from '@kbn/data-views-plugin/public';
// @ts-expect-error
import { fieldCalculator } from './field_calculator';
import { DataTableRecord } from '../../../../../types';

export function getDetails(
  field: DataViewField,
  hits: DataTableRecord[] | undefined,
  columns: string[],
  indexPattern?: DataView
) {
  if (!indexPattern || !hits) {
    return {};
  }
  const details = {
    ...fieldCalculator.getFieldValueCounts({
      hits,
      field,
      count: 5,
      grouped: false,
    }),
    columns,
  };
  if (details.buckets) {
    for (const bucket of details.buckets) {
      bucket.display = indexPattern.getFormatterForField(field).convert(bucket.value);
    }
  }
  return details;
}
