/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import { css } from '@emotion/react';
import { useEuiFontSize, useEuiTheme } from '@elastic/eui';

/** The styles of the tiles that show the operators of a driver. */
export const useOperatorStripStyles = () => {
  const { euiTheme } = useEuiTheme();
  const { fontSize: small } = useEuiFontSize('xs');

  return useMemo(
    () => ({
      strip: css`
        display: flex;
        flex-wrap: wrap;
        gap: ${euiTheme.size.xs};
      `,
      stripStep: css`
        display: flex;
        flex-direction: column;
        /* A tile is as wide as what it says, and shares the free room of its row by share. */
        flex-basis: auto;
        flex-shrink: 0;
        max-width: 100%;
        gap: ${euiTheme.size.xs};
        padding: ${euiTheme.size.s};
        text-align: start;
        color: inherit;
        background: transparent;
        border: none;
        border-radius: ${euiTheme.border.radius.medium};
        cursor: pointer;

        &:hover,
        &[aria-expanded='true'] {
          background: ${euiTheme.colors.backgroundBaseInteractiveHover};
        }
      `,
      stripTitle: css`
        overflow-wrap: anywhere;
        font-weight: ${euiTheme.font.weight.bold};
        font-size: ${euiTheme.font.scale.s * euiTheme.base}px;
        line-height: 1.4;
      `,
      stripShare: css`
        display: flex;
        align-items: center;
        gap: ${euiTheme.size.xs};
        color: ${euiTheme.colors.textSubdued};
        font-size: ${small};
        font-variant-numeric: tabular-nums;
        line-height: 1.4;
        white-space: nowrap;
      `,
      stripBar: css`
        height: ${euiTheme.size.s};
        border-radius: ${euiTheme.border.radius.medium};
      `,
    }),
    [euiTheme, small]
  );
};
