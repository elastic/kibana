/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ControlGroupInput } from '..';
import { ControlStyle, ControlWidth } from '../types';

export const DEFAULT_CONTROL_WIDTH: ControlWidth = 'auto';
export const DEFAULT_CONTROL_STYLE: ControlStyle = 'oneLine';

export const getDefaultControlGroupInput = (): Omit<ControlGroupInput, 'id'> => ({
  panels: {},
  defaultControlWidth: DEFAULT_CONTROL_WIDTH,
  controlStyle: DEFAULT_CONTROL_STYLE,
  chainingSystem: 'HIERARCHICAL',
  ignoreParentSettings: {
    ignoreFilters: false,
    ignoreQuery: false,
    ignoreTimerange: false,
    ignoreValidations: false,
  },
});
