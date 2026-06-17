/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { EuiIconProps } from '@elastic/eui';
import { colors } from './common_styles';
import { ChartIconWrapper } from './icon_simple_wrapper';

export const IconChartMosaic = (props: Omit<EuiIconProps, 'type'>) => (
  <ChartIconWrapper {...props}>
    <path
      className={colors.subdued}
      d="M2 0a1 1 0 00-1 1v2a1 1 0 001 1h6a1 1 0 001-1V1a1 1 0 00-1-1H2zM2 14a1 1 0 00-1 1v6a1 1 0 001 1h6a1 1 0 001-1v-6a1 1 0 00-1-1H2zM11 13a1 1 0 011-1h6a1 1 0 011 1v8a1 1 0 01-1 1h-6a1 1 0 01-1-1v-8zM12 0a1 1 0 100 2h6a1 1 0 100-2h-6zM21 15a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1h-6a1 1 0 01-1-1v-6zM22 0a1 1 0 00-1 1v4a1 1 0 001 1h6a1 1 0 001-1V1a1 1 0 00-1-1h-6z"
    />
    <path
      className={colors.accent}
      d="M11 5a1 1 0 011-1h6a1 1 0 011 1v4a1 1 0 01-1 1h-6a1 1 0 01-1-1V5zM1 7a1 1 0 011-1h6a1 1 0 011 1v4a1 1 0 01-1 1H2a1 1 0 01-1-1V7zM22 8a1 1 0 00-1 1v2a1 1 0 001 1h6a1 1 0 001-1V9a1 1 0 00-1-1h-6z"
    />
  </ChartIconWrapper>
);
