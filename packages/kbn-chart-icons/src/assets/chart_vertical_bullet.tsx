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

export const IconChartVerticalBullet = (props: Omit<EuiIconProps, 'type'>) => (
  <ChartIconWrapper {...props}>
    <path
      className={colors.accent}
      d="M16 22a1 1 0 01-1-1V4a1 1 0 011-1h4a1 1 0 011 1v17a1 1 0 01-1 1h-4z"
    />
    <path
      className={colors.subdued}
      d="M10 0h2a1 1 0 011 1v20a1 1 0 01-1 1h-2a1 1 0 110-2h1v-3h-1a1 1 0 110-2h1v-3h-1a1 1 0 110-2h1V7h-1a1 1 0 010-2h1V2h-1a1 1 0 010-2z"
    />
  </ChartIconWrapper>
);
