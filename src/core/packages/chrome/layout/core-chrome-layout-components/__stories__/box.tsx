/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { ReactNode } from 'react';
import { SerializedStyles, css } from '@emotion/react';
import { tint, useEuiTheme } from '@elastic/eui';

interface BoxProps {
  color: string;
  backgroundColor: string;
  children?: ReactNode;
  label?: string;
  rootCSS?: SerializedStyles;
  labelCSS?: SerializedStyles;
}

export const Box = ({ color, backgroundColor, rootCSS, label, children, labelCSS }: BoxProps) => {
  const { euiTheme } = useEuiTheme();

  const rootStyle = css`
    background: ${tint(backgroundColor, 0.85)};
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    width: 100%;
    color: ${color};
    position: relative;
    overflow: hidden;
    flex-direction: column;
    gap: ${euiTheme.size.m};

    clip-path: polygon(
      6px 2px,
      calc(100% - 6px) 2px,
      calc(100% - 2px) 6px,
      calc(100% - 2px) calc(100% - 6px),
      calc(100% - 6px) calc(100% - 2px),
      6px calc(100% - 2px),
      2px calc(100% - 6px),
      2px 6px
    );

    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      width: 100%;
      background: linear-gradient(
        to bottom right,
        transparent 49%,
        ${color} 49%,
        ${color} 51%,
        transparent 51%
      );
      background-size: 8px 8px;
      pointer-events: none;
      z-index: 0;
    }

    & > * {
      z-index: 1;
    }
    ${rootCSS}
  `;

  const labelStyle = css`
    color: ${color};
    background: ${tint(backgroundColor, 0.85)};
    display: block;
    z-index: 1;
    padding: ${euiTheme.size.s} ${euiTheme.size.m};
    border-radius: ${euiTheme.border.radius.small};
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    ${labelCSS}
  `;

  return (
    <div css={rootStyle}>
      <span css={labelStyle}>{label}</span>
      {children}
    </div>
  );
};
