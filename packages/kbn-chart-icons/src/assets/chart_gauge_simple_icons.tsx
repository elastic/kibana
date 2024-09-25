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
import { IconSimpleWrapper } from './icon_simple_wrapper';

export const IconChartLinearSimple = (props: Omit<EuiIconProps, 'type'>) => (
  <IconSimpleWrapper {...props}>
    <path d="M0 7.5C0 7.22386 0.223858 7 0.5 7H15.5C15.7761 7 16 7.22386 16 7.5V9.5C16 9.77614 15.7761 10 15.5 10C15.2239 10 15 9.77614 15 9.5V8H1V9.5C1 9.77614 0.776142 10 0.5 10C0.223858 10 0 9.77614 0 9.5V7.5Z" />
  </IconSimpleWrapper>
);

export const IconChartGaugeSemiCircleSimple = (props: Omit<EuiIconProps, 'type'>) => (
  <IconSimpleWrapper {...props}>
    <path d="M1.01894 11H2.5C2.77614 11 3 11.2239 3 11.5C3 11.7761 2.77614 12 2.5 12H0.5C0.223858 12 0 11.7761 0 11.5C0 7.35786 3.35786 4 7.5 4C11.6421 4 15 7.35786 15 11.5C15 11.7761 14.7761 12 14.5 12H12.5C12.2239 12 12 11.7761 12 11.5C12 11.2239 12.2239 11 12.5 11H13.9811C13.7257 7.64378 10.9216 5 7.5 5C4.07839 5 1.27426 7.64378 1.01894 11Z" />
  </IconSimpleWrapper>
);

export const IconChartGaugeCircleSimple = (props: Omit<EuiIconProps, 'type'>) => (
  <IconSimpleWrapper {...props}>
    <path d="M7.5 1C3.91015 1 1 3.91015 1 7.5C1 11.0899 3.91015 14 7.5 14C11.0899 14 14 11.0899 14 7.5C14 3.91015 11.0899 1 7.5 1ZM0 7.5C0 3.35786 3.35786 0 7.5 0C11.6421 0 15 3.35786 15 7.5C15 11.6421 11.6421 15 7.5 15C3.35786 15 0 11.6421 0 7.5Z" />
  </IconSimpleWrapper>
);

export const IconChartGaugeArcSimple = (props: Omit<EuiIconProps, 'type'>) => (
  <IconSimpleWrapper {...props}>
    <path d="M12.0962 3.90381C9.55779 1.3654 5.44221 1.3654 2.90381 3.90381C0.484359 6.32325 0.370973 10.1755 2.56365 12.7292L3.61091 11.682C3.80617 11.4867 4.12276 11.4867 4.31802 11.682C4.51328 11.8772 4.51328 12.1938 4.31802 12.3891L2.90381 13.8033C2.70854 13.9986 2.39196 13.9986 2.1967 13.8033C-0.732233 10.8744 -0.732233 6.12563 2.1967 3.1967C5.12563 0.267767 9.87437 0.267767 12.8033 3.1967C15.7322 6.12563 15.7322 10.8744 12.8033 13.8033C12.608 13.9986 12.2915 13.9986 12.0962 13.8033L10.682 12.3891C10.4867 12.1938 10.4867 11.8772 10.682 11.682C10.8772 11.4867 11.1938 11.4867 11.3891 11.682L12.4364 12.7292C14.629 10.1755 14.5156 6.32325 12.0962 3.90381Z" />
  </IconSimpleWrapper>
);
