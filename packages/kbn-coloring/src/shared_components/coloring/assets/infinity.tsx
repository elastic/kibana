/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiIconProps } from '@elastic/eui';

export const InfinityIcon = (props: Omit<EuiIconProps, 'type'>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" {...props}>
    <path d="M2.586 9.414a2 2 0 0 1 2.809-2.847l.601.679 1.336-1.508-.462-.522a4 4 0 1 0 0 5.569l-1.5-1.328a2 2 0 0 1-2.784-.043Z" />
    <path d="m5.373 9.458 1.497 1.326 3.757-4.242.002.001a2 2 0 1 1-.024 2.89l-.601-.679-1.336 1.508.462.522a4 4 0 1 0 0-5.569L5.373 9.459Z" />
  </svg>
);
