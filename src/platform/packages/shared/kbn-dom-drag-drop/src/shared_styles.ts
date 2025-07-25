/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import type { UseEuiTheme } from '@elastic/eui';

// refactored mixins

export const DRAG_DROP_Z_LEVEL_0 = 0;
export const DRAG_DROP_Z_LEVEL_1 = 1;
export const DRAG_DROP_Z_LEVEL_2 = 2;
export const DRAG_DROP_Z_LEVEL_3 = 3;
export const domDragAndDrop = ({ euiTheme }: UseEuiTheme) =>
  css({
    transition: `${euiTheme.animation.fast} ease-in-out`,
    transitionProperty: 'background-color, border-color, opacity',
    zIndex: DRAG_DROP_Z_LEVEL_1,
    borderRadius: euiTheme.border.radius.medium,
  });
