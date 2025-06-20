/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { $Values } from '@kbn/utility-types';
import {
  LENS_CATEGORY_DISPLAY,
  LENS_LEGEND_DISPLAY,
  LENS_NUMBER_DISPLAY,
  LENS_LAYER_TYPES,
} from './constants';

export type CategoryDisplayType = $Values<typeof LENS_CATEGORY_DISPLAY>;
export type NumberDisplayType = $Values<typeof LENS_NUMBER_DISPLAY>;
export type LegendDisplayType = $Values<typeof LENS_LEGEND_DISPLAY>;

export type LensLayerType = (typeof LENS_LAYER_TYPES)[keyof typeof LENS_LAYER_TYPES];

export type CollapseFunction = 'sum' | 'avg' | 'min' | 'max';
