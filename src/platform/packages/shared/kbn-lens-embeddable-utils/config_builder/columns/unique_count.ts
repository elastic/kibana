/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CardinalityIndexPatternColumn } from '@kbn/lens-plugin/public';
import type { LensApiUniqueCountMetricOperation } from '../schema/metric_ops';
import { fromFormatAPIToLensState, fromFormatLensStateToAPI } from './format';
import { fromFilterAPIToLensState, fromFilterLensStateToAPI } from './filter';

export const fromUniqueCountAPItoLensState = (
  options: LensApiUniqueCountMetricOperation
): CardinalityIndexPatternColumn => {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { label, field, format, empty_as_null, filter, ...params } = options;
  return {
    dataType: 'number',
    isBucketed: false,
    label: label || 'Unique count',
    customLabel: !!label,
    operationType: 'unique_count',
    sourceField: field,
    ...params,
    ...(filter ? fromFilterAPIToLensState(filter) : {}),
    params: {
      format: fromFormatAPIToLensState(format),
      emptyAsNull: empty_as_null || false,
    },
  };
};

export const fromUniqueCountLensStateToAPI = (
  options: CardinalityIndexPatternColumn
): LensApiUniqueCountMetricOperation => {
  const { label, sourceField, filter, params } = options;
  const { format, emptyAsNull, ...restParams } = params || {};
  return {
    operation: 'unique_count',
    label,
    field: sourceField,
    ...(filter ? fromFilterLensStateToAPI(filter) : {}),
    ...(format ? { format: fromFormatLensStateToAPI(format) } : {}),
    ...(emptyAsNull ? { empty_as_null: emptyAsNull } : {}),
    ...restParams,
  };
};
