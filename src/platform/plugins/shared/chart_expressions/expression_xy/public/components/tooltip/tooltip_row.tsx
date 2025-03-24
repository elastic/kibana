/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type UseEuiTheme, shade } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { FC } from 'react';

export interface TooltipData {
  label?: string;
  value?: string;
}

export const TooltipRow: FC<TooltipData> = ({ label, value }) => {
  return label && value ? (
    <tr>
      <td
        css={({ euiTheme }: UseEuiTheme) => css`
          font-weight: ${euiTheme.font.weight.medium};
          color: ${shade(euiTheme.colors.ghost, 0.2)};
        `}
      >
        <div
          css={({ euiTheme }: UseEuiTheme) =>
            css`
              max-width: calc(${euiTheme.size.xl} * 5);
              overflow-wrap: break-word;
            `
          }
        >
          {label}
        </div>
      </td>

      <td>
        <div
          css={css`
            overflow-wrap: break-word;
          `}
        >
          {value}
        </div>
      </td>
    </tr>
  ) : null;
};
