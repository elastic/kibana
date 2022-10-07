/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { Global } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';

import { vegaVisTooltipStyles } from '../vega_view/vega_tooltip.styles';

export const GlobalVegaVisStyles = () => {
  const euiTheme = useEuiTheme();

  const tooltipStyles = vegaVisTooltipStyles(euiTheme);

  return <Global styles={[tooltipStyles]} />;
};
