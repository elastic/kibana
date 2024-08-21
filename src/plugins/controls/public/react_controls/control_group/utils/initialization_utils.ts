/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  DEFAULT_CONTROL_GROW,
  DEFAULT_CONTROL_STYLE,
  DEFAULT_CONTROL_WIDTH,
} from '../../../../common';
import { ControlGroupRuntimeState } from '../types';

export const getDefaultControlGroupRuntimeState = (): ControlGroupRuntimeState => ({
  initialChildControlState: {},
  defaultControlWidth: DEFAULT_CONTROL_WIDTH,
  defaultControlGrow: DEFAULT_CONTROL_GROW,
  labelPosition: DEFAULT_CONTROL_STYLE,
  chainingSystem: 'HIERARCHICAL',
  autoApplySelections: true,
  ignoreParentSettings: {
    ignoreFilters: false,
    ignoreQuery: false,
    ignoreTimerange: false,
    ignoreValidations: false,
  },
});
