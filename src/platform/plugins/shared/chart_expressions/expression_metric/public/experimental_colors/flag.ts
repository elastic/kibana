/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getFeatureFlagsService } from '../services';
import { isVariantId, type VariantId } from './variants';

export const EXPERIMENTAL_COLORS_FLAG = 'lens.metric.experimentalColors';

export type ExperimentalColorsId = 'default' | VariantId;

const FALLBACK: ExperimentalColorsId = 'default';

export const useExperimentalColorsId = (): ExperimentalColorsId => {
  const value = getFeatureFlagsService().useStringValue<string>(EXPERIMENTAL_COLORS_FLAG, FALLBACK);
  return value === 'default' || isVariantId(value) ? value : FALLBACK;
};
