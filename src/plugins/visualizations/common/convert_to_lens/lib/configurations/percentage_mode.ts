/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PercentageModeConfig } from '../../types';
import { ExtendedPaletteParams } from './types';

export const getPercentageModeConfig = (params: ExtendedPaletteParams): PercentageModeConfig => {
  if (!params.percentageMode) {
    return { isPercentageMode: false };
  }
  const { colorsRange } = params;
  return {
    isPercentageMode: true,
    min: colorsRange[0].from,
    max: colorsRange[colorsRange.length - 1].to,
  };
};
