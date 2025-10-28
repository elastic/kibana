/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { StaticValueIndexPatternColumn } from '@kbn/lens-common';
import type { LensApiStaticValueOperation } from '../../schema/metric_ops';
import { fromFormatAPIToLensState, fromFormatLensStateToAPI } from './format';
import { getLensAPIMetricSharedProps, getLensStateMetricSharedProps } from './utils';

export const fromStaticValueAPItoLensState = (
  options: LensApiStaticValueOperation
): StaticValueIndexPatternColumn => {
  const { value, format } = options;

  const { label, customLabel, dataType, isBucketed } = getLensStateMetricSharedProps(options);
  return {
    operationType: 'static_value',
    label,
    customLabel,
    dataType,
    isBucketed,
    references: [],
    params: {
      value: String(value),
      ...(format ? { format: fromFormatAPIToLensState(format) } : {}),
    },
  };
};

export const fromStaticValueLensStateToAPI = (
  options: StaticValueIndexPatternColumn
): LensApiStaticValueOperation => {
  return {
    operation: 'static_value',
    value: Number(options.params?.value),
    ...getLensAPIMetricSharedProps(options),
    ...(options.params?.format ? { format: fromFormatLensStateToAPI(options.params.format) } : {}),
  };
};
