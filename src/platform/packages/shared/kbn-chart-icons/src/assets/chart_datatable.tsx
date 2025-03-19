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

export const IconChartDatatable = (props: Omit<EuiIconProps, 'type'>) => (
  <ChartIconWrapper {...props}>
    <path
      d="M11 18a1 1 0 011 1v2a1 1 0 01-1 1H1a1 1 0 01-1-1v-2a1 1 0 011-1h10zm0-6a1 1 0 011 1v2a1 1 0 01-1 1H1a1 1 0 01-1-1v-2a1 1 0 011-1h10zm0-6a1 1 0 011 1v2a1 1 0 01-1 1H1a1 1 0 01-1-1V7a1 1 0 011-1h10zm18-6a1 1 0 011 1v2a1 1 0 01-1 1H1a1 1 0 01-1-1V1a1 1 0 011-1h28z"
      className={colors.subdued}
    />
    <path
      d="M20 18a1 1 0 011 1v2a1 1 0 01-.883.993L20 22h-5a1 1 0 01-1-1v-2a1 1 0 011-1h5zm9 0a1 1 0 011 1v2a1 1 0 01-1 1h-5a1 1 0 01-1-1v-2a1 1 0 011-1h5zm-9-6a1 1 0 011 1v2a1 1 0 01-.883.993L20 16h-5a1 1 0 01-1-1v-2a1 1 0 011-1h5zm9 0a1 1 0 011 1v2a1 1 0 01-1 1h-5a1 1 0 01-1-1v-2a1 1 0 011-1h5zm-9-6a1 1 0 011 1v2a1 1 0 01-.883.993L20 10h-5a1 1 0 01-1-1V7a1 1 0 011-1h5zm9 0a1 1 0 011 1v2a1 1 0 01-1 1h-5a1 1 0 01-1-1V7a1 1 0 011-1h5z"
      className={colors.accent}
    />
  </ChartIconWrapper>
);
