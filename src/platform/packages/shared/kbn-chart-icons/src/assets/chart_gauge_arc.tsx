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

export const IconChartGaugeArc = (props: Omit<EuiIconProps, 'type'>) => (
  <ChartIconWrapper {...props}>
    <path
      className={colors.accent}
      d="M5.9 20.7c-.5 0-1-.2-1.3-.7-1.2-1.9-1.9-4.2-1.9-6.5C2.8 6.8 8.3 1.3 15 1.3c5.3 0 10.2 3.6 11.7 8.7.2.8-.2 1.6-1 1.9-.8.2-1.6-.2-1.9-1C22.7 7 19 4.3 15 4.3c-5.1 0-9.2 4.1-9.2 9.2 0 1.7.5 3.4 1.4 4.9.4.7.2 1.6-.5 2.1-.2.1-.5.2-.8.2z"
    />
    <g className={colors.subdued}>
      <path d="m10 18.6.8-.6-.6-.8-1.5 1.2v.1c.3.4.9.4 1.3.1zm9.2-.6.8.6c.4.3 1 .3 1.3-.2l-1.5-1.2-.6.8z" />
      <path d="m21.3 18.5-1.6-1.2c.9-1.1 1.3-2.4 1.3-3.8 0-3.3-2.7-6-6-6s-6 2.7-6 6c0 1.3.4 2.6 1.3 3.7l-1.6 1.2C7.5 17 7 15.3 7 13.5c0-4.4 3.6-8 8-8s8 3.6 8 8c0 1.8-.6 3.6-1.7 5z" />
      <path d="m10.7 18.1.7-.5c.4-.3.4-.9.1-1.2-.3-.4-.9-.4-1.2-.1l-.7.5M8.7 13l.9.2c.5.1.9-.2 1-.7s-.2-.9-.7-1l-.9-.2m2.5-3 .4.8c.2.4.7.6 1.2.4.4-.2.6-.7.4-1.2l-.4-.8m3.8 0-.4.8c-.2.4 0 1 .4 1.2s1 0 1.2-.4l.4-.8m2.4 3-.9.2c-.5.1-.8.6-.7 1s.6.8 1 .7l.9-.2m-.8 3.7-.7-.5c-.4-.3-.9-.2-1.2.1-.3.4-.2.9.1 1.2l.7.5" />
    </g>
  </ChartIconWrapper>
);
