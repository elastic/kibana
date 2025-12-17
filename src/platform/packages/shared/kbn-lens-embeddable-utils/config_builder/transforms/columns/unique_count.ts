/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CardinalityIndexPatternColumn } from '@kbn/lens-common';
import type { LensApiUniqueCountMetricOperation } from '../../schema/metric_ops';
import { fromFormatAPIToLensState, fromFormatLensStateToAPI } from './format';
import { getLensAPIMetricSharedProps, getLensStateMetricSharedProps } from './utils';

export const fromUniqueCountAPItoLensState = (
  options: LensApiUniqueCountMetricOperation
): CardinalityIndexPatternColumn => {
  const { field, format, empty_as_null } = options;
  return {
    operationType: 'unique_count',
    sourceField: field,
    ...getLensStateMetricSharedProps(options),
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
    ...getLensAPIMetricSharedProps(options),
    ...(format ? { format: fromFormatLensStateToAPI(format) } : {}),
  };
};
