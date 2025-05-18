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

export const IconChartBarStacked = (props: Omit<EuiIconProps, 'type'>) => (
  <ChartIconWrapper {...props}>
    <path
      className={colors.subdued}
      d="M6 13v8a1 1 0 01-1 1H1a1 1 0 01-1-1v-8h6zm8-4v12a1 1 0 01-1 1H9a1 1 0 01-1-1V9h6zm8 4v8a1 1 0 01-1 1h-4a1 1 0 01-1-1v-8h6zm8 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1v-7h6z"
    />
    <path
      d="M29 1a1 1 0 011 1v10h-6V2a1 1 0 011-1h4zM5 7a1 1 0 011 1v3H0V8a1 1 0 011-1h4zm16-4a1 1 0 011 1v7h-6V4a1 1 0 011-1h4zm-8-3a1 1 0 011 1v6H8V1a1 1 0 011-1h4z"
      className={colors.accent}
    />
  </ChartIconWrapper>
);
