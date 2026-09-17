/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type ReactNode } from 'react';
import { css } from '@emotion/react';
import { euiScrollBarStyles, useEuiTheme } from '@elastic/eui';

const POPOVER_WIDTH = 400;

export const PopoverBody = ({
  children,
  maxHeight,
  'data-test-subj': dataTestSubj,
}: {
  children: ReactNode;
  /** Room available in the viewport, in px; the body never grows past it. */
  maxHeight?: number;
  'data-test-subj'?: string;
}) => {
  const euiThemeContext = useEuiTheme();
  const { euiTheme } = euiThemeContext;
  return (
    <div
      css={css`
        ${euiScrollBarStyles(euiThemeContext)}
        width: ${POPOVER_WIDTH}px;
        max-width: calc(100vw - ${euiTheme.size.xxl});
        max-height: ${maxHeight === undefined ? '60vh' : `min(60vh, ${maxHeight}px)`};
        overflow-y: auto;
        // Keeps the scroll box from clipping avatars and focus rings.
        padding: ${euiTheme.size.xs} ${euiTheme.size.xs} ${euiTheme.size.xs} 0;
      `}
      data-test-subj={dataTestSubj}
    >
      {children}
    </div>
  );
};
