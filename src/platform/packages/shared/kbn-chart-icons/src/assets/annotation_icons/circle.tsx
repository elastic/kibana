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
import { IconSimpleWrapper } from '../icon_simple_wrapper';

export const IconCircle = (props: Omit<EuiIconProps, 'type'>) => (
  <IconSimpleWrapper {...props}>
    <path d="M7.427.522c-.813.081-1.398.21-2.039.45a7.318 7.318 0 0 0-2.67 1.72A7.045 7.045 0 0 0 1.28 4.68 7.241 7.241 0 0 0 .507 8c0 1.196.243 2.24.773 3.32a7.047 7.047 0 0 0 1.425 1.975A7.047 7.047 0 0 0 4.68 14.72a7.254 7.254 0 0 0 3.32.773 7.254 7.254 0 0 0 3.32-.773 7.047 7.047 0 0 0 1.975-1.425 7.047 7.047 0 0 0 1.425-1.975A7.254 7.254 0 0 0 15.493 8a7.254 7.254 0 0 0-.773-3.32 7.045 7.045 0 0 0-1.438-1.988C12.111 1.524 10.695.818 9.027.571 8.773.533 7.659.499 7.427.522m1.426 1.041a6.519 6.519 0 0 1 3.091 1.271c.329.246.976.893 1.222 1.222.561.751.976 1.634 1.164 2.479a6.766 6.766 0 0 1 0 2.93c-.414 1.861-1.725 3.513-3.463 4.363a6.76 6.76 0 0 1-1.987.616c-.424.065-1.336.065-1.76 0-1.948-.296-3.592-1.359-4.627-2.993a7.502 7.502 0 0 1-.634-1.332A6.158 6.158 0 0 1 1.514 8c0-1.039.201-1.925.646-2.84.34-.698.686-1.18 1.253-1.747A5.956 5.956 0 0 1 5.16 2.16a6.452 6.452 0 0 1 3.693-.597" />
  </IconSimpleWrapper>
);
