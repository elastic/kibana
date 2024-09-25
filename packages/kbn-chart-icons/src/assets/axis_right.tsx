/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiIconProps } from '@elastic/eui';
import React from 'react';
import { IconSimpleWrapper } from './icon_simple_wrapper';

export const EuiIconAxisRight = (props: Omit<EuiIconProps, 'type'>) => (
  <IconSimpleWrapper {...props}>
    <path d="M8.622 3.585a.5.5 0 01-.353-.854L10.39.611a1.5 1.5 0 012.121 0l2.122 2.12a.5.5 0 11-.707.707l-2.122-2.12a.5.5 0 00-.707 0l-2.121 2.12a.5.5 0 01-.354.147z" />
    <path d="M11.95 12.915V8.786l.005-.04V3.087a.5.5 0 00-.992-.09l-.01.09v4.129l-.004.04v5.658a.5.5 0 00.992.09l.01-.09z" />
    <path d="M11.45 15.829a1.5 1.5 0 01-1.06-.44l-2.122-2.121a.5.5 0 11.707-.707l2.121 2.121a.5.5 0 00.707 0l2.122-2.121a.5.5 0 01.707.707l-2.121 2.121a1.5 1.5 0 01-1.061.44zM2.5 4a.5.5 0 00-.5.5v7a.5.5 0 101 0v-7a.5.5 0 00-.5-.5zM5.5 6.5a.5.5 0 00-1 0v5a.5.5 0 101 0v-5zM7.5 8a.5.5 0 01.5.5v3a.5.5 0 11-1 0v-3a.5.5 0 01.5-.5z" />
  </IconSimpleWrapper>
);
