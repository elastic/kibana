/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { forwardRef } from 'react';
import type { ChartSize } from '../chart';
import { ChartSizes } from '../chart';

export const ChartContainer = forwardRef<
  HTMLDivElement,
  { children: React.ReactNode; size: ChartSize }
>(({ children, size }, ref) => {
  const { euiTheme } = useEuiTheme();

  return (
    <div
      css={css`
        height: ${ChartSizes[size]}px;
        outline: ${euiTheme.border.width.thin} solid ${euiTheme.colors.lightShade};
        border-radius: ${euiTheme.border.radius.medium};

        &:hover {
          .metricsExperienceChartTitle {
            z-index: ${Number(euiTheme.levels.menu) + 1};
            transition: none;
          }
        }
      `}
      ref={ref}
    >
      {children}
    </div>
  );
});
