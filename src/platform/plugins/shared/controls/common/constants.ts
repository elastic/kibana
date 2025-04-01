/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ControlGroupChainingSystem } from './control_group';
import { ControlLabelPosition, ControlWidth } from './types';

export const CONTROL_WIDTH_OPTIONS = { SMALL: 'small', MEDIUM: 'medium', LARGE: 'large' } as const;
export const CONTROL_LABEL_POSITION_OPTIONS = { ONE_LINE: 'oneLine', TWO_LINE: 'twoLine' } as const;
export const CONTROL_CHAINING_OPTIONS = { NONE: 'NONE', HIERARCHICAL: 'HIERARCHICAL' } as const;
export const DEFAULT_CONTROL_WIDTH: ControlWidth = CONTROL_WIDTH_OPTIONS.MEDIUM;
export const DEFAULT_CONTROL_LABEL_POSITION: ControlLabelPosition =
  CONTROL_LABEL_POSITION_OPTIONS.ONE_LINE;
export const DEFAULT_CONTROL_GROW: boolean = false;
export const DEFAULT_CONTROL_CHAINING: ControlGroupChainingSystem =
  CONTROL_CHAINING_OPTIONS.HIERARCHICAL;
export const DEFAULT_IGNORE_PARENT_SETTINGS = {
  ignoreFilters: false,
  ignoreQuery: false,
  ignoreTimerange: false,
  ignoreValidations: false,
} as const;
export const DEFAULT_AUTO_APPLY_SELECTIONS = true;

export const TIME_SLIDER_CONTROL = 'timeSlider';
export const RANGE_SLIDER_CONTROL = 'rangeSliderControl';
export const OPTIONS_LIST_CONTROL = 'optionsListControl';

export const ESQL_CONTROL = 'esqlControl';
