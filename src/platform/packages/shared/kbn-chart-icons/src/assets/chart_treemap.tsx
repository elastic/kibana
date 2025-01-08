/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiIconProps } from '@elastic/eui';
import { colors } from './common_styles';
import { ChartIconWrapper } from './icon_simple_wrapper';

export const IconChartTreemap = (props: Omit<EuiIconProps, 'type'>) => (
  <ChartIconWrapper {...props}>
    <path
      d="M0 1a1 1 0 011-1h13a1 1 0 011 1v20a1 1 0 01-1 1H1a1 1 0 01-1-1V1z"
      className={colors.subdued}
    />
    <path
      d="M17 1a1 1 0 011-1h11a1 1 0 011 1v12a1 1 0 01-1 1H18a1 1 0 01-1-1V1z"
      className={colors.accent}
    />
    <path
      d="M29 16H18a1 1 0 00-1 1v4a1 1 0 001 1h11a1 1 0 001-1v-4a1 1 0 00-1-1z"
      className={colors.subdued}
    />
  </ChartIconWrapper>
);
