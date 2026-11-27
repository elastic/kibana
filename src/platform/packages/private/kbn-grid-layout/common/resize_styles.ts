/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

import type { LayoutClassPrefix } from './types';

export const getResizeHandleStyles =
  (layoutPrefix: LayoutClassPrefix) =>
  ({ euiTheme }: UseEuiTheme) =>
    css({
      right: '0',
      bottom: '0',
      margin: '-2px',
      position: 'absolute',
      width: euiTheme.size.l,
      maxWidth: '100%',
      maxHeight: '100%',
      height: euiTheme.size.l,
      zIndex: euiTheme.levels.toast,
      scrollMarginBottom: euiTheme.size.s,
      '&:hover, &:focus': {
        cursor: 'var(--kbnDragHandleCursor)',
      },
      [`.${layoutPrefix}--static &, .${layoutPrefix}Panel--expanded &`]: {
        display: 'none',
      },
    });

export const resizeGaugeStyles = css({
  right: '0',
  top: '0',
  position: 'absolute',
});
