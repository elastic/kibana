/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import {
  RequiredPaletteParamTypes,
  FIXED_PROGRESSION,
  DEFAULT_CONTINUITY,
  DEFAULT_MIN_STOP,
  DEFAULT_MAX_STOP,
  DEFAULT_COLOR_STEPS,
} from '@kbn/coloring';

export const defaultPaletteParams: RequiredPaletteParamTypes = {
  name: 'temperature',
  reverse: false,
  rangeType: 'percent',
  rangeMin: DEFAULT_MIN_STOP,
  rangeMax: DEFAULT_MAX_STOP,
  progression: FIXED_PROGRESSION,
  stops: [],
  steps: DEFAULT_COLOR_STEPS,
  colorStops: [],
  continuity: DEFAULT_CONTINUITY,
};
