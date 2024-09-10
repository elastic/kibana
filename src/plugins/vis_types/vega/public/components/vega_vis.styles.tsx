/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { css, Global } from '@emotion/react';
import { useEuiTheme, UseEuiTheme, euiScrollBarStyles } from '@elastic/eui';

import { vegaBaseViewStyles } from '../vega_view/vega_base_view.styles';
import { vegaVisTooltipStyles } from '../vega_view/vega_tooltip.styles';

// Styles for non-React DOM nodes that's easier to set at the Global level
export const GlobalVegaVisStyles = () => {
  const euiTheme = useEuiTheme();

  const baseViewStyles = vegaBaseViewStyles(euiTheme);
  const tooltipStyles = vegaVisTooltipStyles(euiTheme);

  return <Global styles={[tooltipStyles, baseViewStyles]} />;
};

export const wrapperStyles = (euiTheme: UseEuiTheme) => css`
  ${euiScrollBarStyles(euiTheme)}
  display: flex;
  flex: 1 1 0;
  overflow: auto;
`;
