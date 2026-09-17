/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiIcon, useEuiTheme, type UseEuiTheme } from '@elastic/eui';
import { PIN_SIZE } from '../constants';

/** Teardrop pin shape shared by the placed pins and the pending pin. */
export const pinShapeStyles = (
  euiTheme: UseEuiTheme['euiTheme'],
  { background, dashed = false }: { background: string; dashed?: boolean }
) => css`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${PIN_SIZE}px;
  height: ${PIN_SIZE}px;
  border-radius: 50% 50% 50% 0;
  border: 2px ${dashed ? 'dashed' : 'solid'} ${euiTheme.colors.emptyShade};
  background: ${background};
  color: ${euiTheme.colors.emptyShade};
  font-size: ${euiTheme.size.m};
  font-weight: ${euiTheme.font.weight.bold};
  line-height: 1;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
`;

/** Non-interactive pin showing where the comment being written will be placed. */
export const PinMarker = ({ x, y }: { x: number; y: number }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      css={css`
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        transform: translate(-50%, -100%);
        pointer-events: none;
      `}
      data-test-subj="kbnUiAnnotationsPendingPin"
    >
      <span css={pinShapeStyles(euiTheme, { background: euiTheme.colors.primary })}>
        <EuiIcon type="plus" size="s" color="ghost" aria-hidden={true} />
      </span>
    </div>
  );
};
