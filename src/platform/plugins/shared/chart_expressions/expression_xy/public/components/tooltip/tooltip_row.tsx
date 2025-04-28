/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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
        css={({ euiTheme }) => css`
          font-weight: ${euiTheme.font.weight.medium};
        `}
      >
        <div
          css={({ euiTheme }) =>
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
