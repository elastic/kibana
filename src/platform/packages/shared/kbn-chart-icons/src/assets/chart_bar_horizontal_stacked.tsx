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

export const IconChartBarHorizontalStacked = (props: Omit<EuiIconProps, 'type'>) => (
  <ChartIconWrapper {...props}>
    <path
      d="M18 16v6H1a1 1 0 01-1-1v-4a1 1 0 011-1h17zm-3-8v6H1.222C.547 14 0 13.552 0 13V9c0-.552.547-1 1.222-1H15zm1-8v6H1.042C.466 6 0 5.552 0 5V1c0-.552.466-1 1.042-1H16z"
      className={colors.subdued}
    />
    <path
      d="M29 16a1 1 0 011 1v4a1 1 0 01-1 1h-9v-6h9zm-9.222-8C20.453 8 21 8.448 21 9v4c0 .552-.547 1-1.222 1H17V8h2.778zm3.18-8C23.534 0 24 .448 24 1v4c0 .552-.466 1-1.042 1H18V0h4.958z"
      className={colors.accent}
    />
  </ChartIconWrapper>
);
