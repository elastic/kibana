/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CountIndexPatternColumn } from '@kbn/lens-plugin/public';
import type { LensApiCountMetricOperation } from '../../schema/metric_ops';
import { fromFormatAPIToLensState, fromFormatLensStateToAPI } from './format';
import {
  LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
  getLensAPIMetricSharedProps,
  getLensStateMetricSharedProps,
} from './utils';

export type CountColumnParams = CountIndexPatternColumn['params'];

function ofName(field?: string): string {
  if (field == null) {
    return `Count of Records`;
  }
  return `Count of ${field}`;
}

export const fromCountAPItoLensState = (
  options: LensApiCountMetricOperation
): CountIndexPatternColumn => {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { empty_as_null, format, field } = options ?? {};

  return {
    operationType: 'count',
    sourceField: field || '',
    ...getLensStateMetricSharedProps(options, ofName(field)),
    params: {
      emptyAsNull: empty_as_null ?? LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
      ...(format ? { format: fromFormatAPIToLensState(format) } : {}),
    },
  };
};

export const fromCountLensStateToAPI = (
  options: CountIndexPatternColumn
): LensApiCountMetricOperation => {
  return {
    operation: 'count',
    field: options.sourceField,
    ...getLensAPIMetricSharedProps(options, ofName(options.sourceField)),
    ...(options.params?.format ? { format: fromFormatLensStateToAPI(options.params.format) } : {}),
  };
};
