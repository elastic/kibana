/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiIconProps } from '@elastic/eui';
import React from 'react';
import { colors } from './common_styles';
import { ChartIconWrapper } from './icon_simple_wrapper';

export const IconChartHeatmap = (props: Omit<EuiIconProps, 'type'>) => (
  <ChartIconWrapper {...props}>
    <path
      className={colors.subdued}
      d="M16 1a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V1zM0 17a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H1a1 1 0 01-1-1v-4zm17-9a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V9a1 1 0 00-1-1h-4zm-1 9a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4zm9-17a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V1a1 1 0 00-1-1h-4z"
    />
    <path
      className={colors.accent}
      d="M0 1a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H1a1 1 0 01-1-1V1zm0 8a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H1a1 1 0 01-1-1V9zm9-9a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V1a1 1 0 00-1-1H9zM8 9a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H9a1 1 0 01-1-1V9zm1 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1v-4a1 1 0 00-1-1H9zm15-7a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V9zm1 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1v-4a1 1 0 00-1-1h-4z"
    />
  </ChartIconWrapper>
);
