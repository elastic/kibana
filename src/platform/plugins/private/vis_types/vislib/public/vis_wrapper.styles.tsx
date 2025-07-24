/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { Global } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import { vislibLayoutStyles } from './vislib/lib/layout/layout.styles';
import { vislibMeterStyles } from './vislib/visualizations/gauges/meter.styles';

// Styles for non-React DOM nodes
export const GlobalVislibWrapperStyles = () => {
  const euiThemeContext = useEuiTheme();

  const layoutStyles = vislibLayoutStyles(euiThemeContext);
  const meterStyles = vislibMeterStyles(euiThemeContext);

  return <Global styles={[layoutStyles, meterStyles]} />;
};
