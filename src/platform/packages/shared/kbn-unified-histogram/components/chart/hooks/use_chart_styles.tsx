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

export const useChartStyles = (chartVisible: boolean) => {
  const { euiTheme } = useEuiTheme();

  const chartToolbarCss = css`
    padding: ${euiTheme.size.s} ${euiTheme.size.s} ${chartVisible ? 0 : euiTheme.size.s}
      ${euiTheme.size.s};
    min-height: ${euiTheme.base * 2.5}px;
  `;

  const histogramCss = css`
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    position: relative;

    // SASSTODO: the visualizing component should have an option or a modifier
    .series > rect {
      fill-opacity: 0.5;
      stroke-width: 1;
    }
  `;

  return {
    chartToolbarCss,
    histogramCss,
  };
};
