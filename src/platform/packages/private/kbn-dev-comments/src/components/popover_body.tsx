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
import { useEuiTheme } from '@elastic/eui';
import { containProps } from './hooks';

const POPOVER_WIDTH = 400;

/**
 * The frame of the layer's popovers, filling the panel (which is why the padding
 * is here): a column of a fixed width that never grows past the room available;
 * content that has to scroll does so within it.
 */
export const PopoverBody = ({
  children,
  maxHeight,
  'data-test-subj': dataTestSubj,
}: {
  children: ReactNode;
  /** Room available in the viewport, in px. */
  maxHeight?: number;
  'data-test-subj'?: string;
}) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      {...containProps}
      css={css`
        display: flex;
        flex-direction: column;
        box-sizing: content-box;
        width: ${POPOVER_WIDTH}px;
        max-width: calc(100vw - ${euiTheme.size.xxl} - 2 * ${euiTheme.size.m});
        max-height: ${maxHeight === undefined ? '60vh' : `min(60vh, ${maxHeight}px)`};
        padding: ${euiTheme.size.m};
      `}
      data-test-subj={dataTestSubj}
    >
      {children}
    </div>
  );
};
