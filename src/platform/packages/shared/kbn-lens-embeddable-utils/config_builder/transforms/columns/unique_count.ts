/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CardinalityIndexPatternColumn } from '@kbn/lens-plugin/public';
import type { LensApiUniqueCountMetricOperation } from '../../schema/metric_ops';
import { fromFormatAPIToLensState, fromFormatLensStateToAPI } from './format';
import {
  LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
  getLensAPIMetricSharedProps,
  getLensStateMetricSharedProps,
} from './utils';

function ofName(field: string): string {
  return `Unique Count of ${field}`;
}

export const fromUniqueCountAPItoLensState = (
  options: LensApiUniqueCountMetricOperation
): CardinalityIndexPatternColumn => {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { field, format, empty_as_null } = options;
  return {
    operationType: 'unique_count',
    sourceField: field,
    ...getLensStateMetricSharedProps(options, ofName(field)),
    params: {
      format: fromFormatAPIToLensState(format),
      emptyAsNull: empty_as_null,
    },
  };
};

export const fromUniqueCountLensStateToAPI = (
  options: CardinalityIndexPatternColumn
): LensApiUniqueCountMetricOperation => {
  const { sourceField, params } = options;
  const { format, emptyAsNull } = params || {};
  return {
    operation: 'unique_count',
    field: sourceField,
    empty_as_null: Boolean(emptyAsNull),
    ...getLensAPIMetricSharedProps(options, ofName(options.sourceField)),
    ...(format ? { format: fromFormatLensStateToAPI(format) } : {}),
  };
};
