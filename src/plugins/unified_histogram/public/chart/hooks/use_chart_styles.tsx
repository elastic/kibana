/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useEuiBreakpoint, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

export const useChartStyles = (chartVisible: boolean) => {
  const { euiTheme } = useEuiTheme();
  const resultCountCss = css`
    padding: ${euiTheme.size.s} ${euiTheme.size.s} ${chartVisible ? 0 : euiTheme.size.s}
      ${euiTheme.size.s};
    min-height: ${euiTheme.base * 2.5}px;
  `;
  const resultCountInnerCss = css`
    ${useEuiBreakpoint(['xs', 's'])} {
      align-items: center;
    }
  `;
  const resultCountTitleCss = css`
    flex-basis: auto;

    ${useEuiBreakpoint(['xs', 's'])} {
      margin-bottom: 0 !important;
    }
  `;
  const resultCountToggleCss = css`
    flex-basis: auto;
    min-width: 0;

    ${useEuiBreakpoint(['xs', 's'])} {
      align-items: flex-end;
    }
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
  const breakdownFieldSelectorGroupCss = css`
    width: 100%;
  `;
  const breakdownFieldSelectorItemCss = css`
    min-width: 0;
    align-items: flex-end;
    padding-left: ${euiTheme.size.s};
  `;
  const chartToolButtonCss = css`
    display: flex;
    justify-content: center;
    padding-left: ${euiTheme.size.s};
  `;

  return {
    resultCountCss,
    resultCountInnerCss,
    resultCountTitleCss,
    resultCountToggleCss,
    histogramCss,
    breakdownFieldSelectorGroupCss,
    breakdownFieldSelectorItemCss,
    chartToolButtonCss,
  };
};
