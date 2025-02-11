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

export const IconChartMetric = (props: Omit<EuiIconProps, 'type'>) => (
  <ChartIconWrapper {...props}>
    <path
      d="M25 0a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V1a1 1 0 011-1h20zm-9.878 3c-1.887 0-3.265 1.107-3.26 2.61-.005 1.054.67 1.938 1.672 2.157v.067l-.155.03a2.453 2.453 0 00-1.879 2.394C11.495 11.84 12.997 13 15.122 13c2.105 0 3.612-1.16 3.617-2.742-.005-1.217-.903-2.234-2.035-2.424v-.067l.162-.042c.896-.275 1.507-1.12 1.511-2.116C18.373 4.112 16.994 3 15.122 3zm0 5.542c1.036 0 1.796.665 1.806 1.592-.01.898-.718 1.507-1.806 1.507-1.103 0-1.816-.609-1.806-1.507-.01-.932.755-1.592 1.806-1.592zm0-4.164c.908 0 1.53.561 1.54 1.398-.01.85-.651 1.43-1.54 1.43-.903 0-1.55-.584-1.54-1.43-.01-.837.618-1.398 1.54-1.398z"
      className={colors.accent}
    />
    <path
      d="M1 18h28a1 1 0 011 1v2a1 1 0 01-1 1H1a1 1 0 01-1-1v-2a1 1 0 011-1z"
      className={colors.subdued}
    />
  </ChartIconWrapper>
);
