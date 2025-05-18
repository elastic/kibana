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

export const IconChartHorizontalBullet = (props: Omit<EuiIconProps, 'type'>) => (
  <ChartIconWrapper {...props}>
    <path
      className={colors.subdued}
      d="M1 13a1 1 0 00-1 1v2a1 1 0 102 0v-1h5v1a1 1 0 102 0v-1h5v1a1 1 0 102 0v-1h5v1a1 1 0 102 0v-1h5v1a1 1 0 102 0v-2a1 1 0 00-1-1H1z"
    />
    <path
      className={colors.accent}
      d="M0 6a1 1 0 011-1h24a1 1 0 011 1v4a1 1 0 01-1 1H1a1 1 0 01-1-1V6z"
    />
  </ChartIconWrapper>
);
