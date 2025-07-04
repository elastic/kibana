/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PercentageModeConfig } from '../../types';
import { ExtendedPaletteParams } from './types';

export const getPercentageModeConfig = (
  params: ExtendedPaletteParams,
  respectPercentageMode: boolean = true
): PercentageModeConfig => {
  const { colorsRange } = params;
  const minMax = {
    min: colorsRange[0].from,
    max: colorsRange[colorsRange.length - 1].to,
  };
  if (!params.percentageMode) {
    return respectPercentageMode
      ? { isPercentageMode: false }
      : { isPercentageMode: false, ...minMax };
  }
  return {
    isPercentageMode: true,
    ...minMax,
  };
};
