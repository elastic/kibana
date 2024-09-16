/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ControlGroupChainingSystem, ControlStyle, ControlWidth } from './types';

export const CONTROL_WIDTH_OPTIONS = { SMALL: 'small', MEDIUM: 'medium', LARGE: 'large' } as const;
export const CONTROL_STYLE_OPTIONS = { ONE_LINE: 'oneLine', TWO_LINE: 'twoLine' } as const;
export const CONTROL_CHAINING_OPTIONS = { NONE: 'NONE', HIERARCHICAL: 'HIERARCHICAL' } as const;
export const DEFAULT_CONTROL_WIDTH: ControlWidth = CONTROL_WIDTH_OPTIONS.MEDIUM;
export const DEFAULT_CONTROL_STYLE: ControlStyle = CONTROL_STYLE_OPTIONS.ONE_LINE;
export const DEFAULT_CONTROL_GROW: boolean = true;
export const DEFAULT_CONTROL_CHAINING: ControlGroupChainingSystem =
  CONTROL_CHAINING_OPTIONS.HIERARCHICAL;
