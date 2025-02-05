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

export const IconDonutHoleMedium = (props: Omit<EuiIconProps, 'type'>) => (
  <IconSimpleWrapper {...props}>
    <path d="M7.5 4a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7ZM5 7.5a2.5 2.5 0 1 1 5 0 2.5 2.5 0 0 1-5 0Z" />
    <path d="M7.5 0a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15ZM1 7.5a6.5 6.5 0 1 1 13 0 6.5 6.5 0 0 1-13 0Z" />
  </IconSimpleWrapper>
);

export const IconDonutHoleLarge = (props: Omit<EuiIconProps, 'type'>) => (
  <IconSimpleWrapper {...props}>
    <path d="M7.5 3a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9ZM4 7.5a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0Z" />
    <path d="M7.5 0a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15ZM1 7.5a6.5 6.5 0 1 1 13 0 6.5 6.5 0 0 1-13 0Z" />
  </IconSimpleWrapper>
);

export const IconDonutHoleSmall = (props: Omit<EuiIconProps, 'type'>) => (
  <IconSimpleWrapper {...props}>
    <path d="M7.5 5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5ZM6 7.5a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Z" />
    <path d="M7.5 0a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15ZM1 7.5a6.5 6.5 0 1 1 13 0 6.5 6.5 0 0 1-13 0Z" />
  </IconSimpleWrapper>
);
