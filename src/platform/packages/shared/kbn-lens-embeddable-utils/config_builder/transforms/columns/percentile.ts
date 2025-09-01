/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PercentileIndexPatternColumn } from '@kbn/lens-plugin/public';
import { fromFormatAPIToLensState, fromFormatLensStateToAPI } from './format';
import type { LensApiPercentileOperation } from '../../schema/metric_ops';
import { LENS_PERCENTILE_DEFAULT_VALUE } from '../../schema/constants';
import { getLensAPIMetricSharedProps, getLensStateMetricSharedProps } from './utils';

function ofName(field: string, percentile: number = LENS_PERCENTILE_DEFAULT_VALUE): string {
  return `${percentile}th Percentile of ${field}`;
}

export const fromPercentileAPItoLensState = (
  options: LensApiPercentileOperation
): PercentileIndexPatternColumn => {
  const { field, format, percentile } = options;

  return {
    operationType: 'percentile',
    sourceField: field,
    ...getLensStateMetricSharedProps(options, ofName(field, percentile)),
    params: {
      ...(format ? { format: fromFormatAPIToLensState(format) } : {}),
      percentile: percentile ?? LENS_PERCENTILE_DEFAULT_VALUE,
    },
  };
};

export const fromPercentileLensStateToAPI = (
  options: PercentileIndexPatternColumn
): LensApiPercentileOperation => {
  return {
    operation: options.operationType,
    field: options.sourceField,
    percentile: options.params.percentile ?? LENS_PERCENTILE_DEFAULT_VALUE,
    ...getLensAPIMetricSharedProps(
      options,
      ofName(options.sourceField, options.params?.percentile)
    ),
    ...(options.params?.format ? { format: fromFormatLensStateToAPI(options.params.format) } : {}),
  };
};
