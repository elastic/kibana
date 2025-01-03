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

export const IconChartBarAnnotations = (props: Omit<EuiIconProps, 'type'>) => (
  <ChartIconWrapper {...props}>
    <g>
      <path
        className={colors.subdued}
        d="M16 8a1 1 0 011-1h4a1 1 0 011 1v13a1 1 0 01-1 1h-4a1 1 0 01-1-1V8zM1 9a1 1 0 00-1 1v11a1 1 0 001 1h4a1 1 0 001-1V10a1 1 0 00-1-1H1zM9 16a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1v-4a1 1 0 00-1-1H9zM25 11a1 1 0 00-1 1v9a1 1 0 001 1h4a1 1 0 001-1v-9a1 1 0 00-1-1h-4z"
      />
      <path
        className={colors.accent}
        d="M10 1a1 1 0 011-1h3a1 1 0 011 1h3v4h-3a1 1 0 01-1-1h-2v9a1 1 0 11-2 0V1z"
      />
    </g>
  </ChartIconWrapper>
);
