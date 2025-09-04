/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FormulaIndexPatternColumn } from '@kbn/lens-plugin/public';
import type { LensApiFormulaOperation } from '../../schema/metric_ops';
import { fromFormatAPIToLensState, fromFormatLensStateToAPI } from './format';
import { getLensAPIMetricSharedProps, getLensStateMetricSharedProps } from './utils';

function ofName(formula?: string): string {
  if (formula == null || formula === '') {
    return `Formula`;
  }
  return formula;
}

export const fromFormulaAPItoLensState = (
  options: LensApiFormulaOperation
): FormulaIndexPatternColumn => {
  const { formula, format } = options ?? {};

  const { label, customLabel, dataType, isBucketed, reducedTimeRange, timeScale } =
    getLensStateMetricSharedProps(options, ofName(formula));

  return {
    operationType: 'formula',
    label,
    customLabel,
    dataType,
    isBucketed,
    reducedTimeRange,
    timeScale,
    references: [],
    params: {
      formula: formula ?? '',
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
    ...getLensAPIMetricSharedProps(options, ofName(options.params.formula)),
    ...(options.params?.format ? { format: fromFormatLensStateToAPI(options.params.format) } : {}),
  };
};
