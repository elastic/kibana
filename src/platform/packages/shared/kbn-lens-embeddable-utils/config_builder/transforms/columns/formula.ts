/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FormulaIndexPatternColumn } from '@kbn/lens-common';
import type { LensApiFormulaOperation } from '../../schema/metric_ops';
import { fromFormatAPIToLensState, fromFormatLensStateToAPI } from './format';
import { getLensAPIMetricSharedProps, getLensStateMetricSharedProps } from './utils';

export const fromFormulaAPItoLensState = (
  options: LensApiFormulaOperation
): FormulaIndexPatternColumn => {
  const { formula, format } = options;

  const { timeShift, ...sharedProps } = getLensStateMetricSharedProps(options);

  return {
    operationType: 'formula',
    ...sharedProps,
    references: [],
    params: {
      formula,
      ...(format ? { format: fromFormatAPIToLensState(format) } : {}),
    },
  };
};

export const fromFormulaLensStateToAPI = (
  options: FormulaIndexPatternColumn
): LensApiFormulaOperation => {
  return {
    operation: 'formula',
    ...(options.params?.formula ? { formula: options.params.formula } : { formula: '' }),
    ...getLensAPIMetricSharedProps(options),
    ...(options.params?.format ? { format: fromFormatLensStateToAPI(options.params.format) } : {}),
  };
};
