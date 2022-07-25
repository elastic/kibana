/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiIconProps } from '@elastic/eui';

export const RelatedIcon = (props: Omit<EuiIconProps, 'type'>) => (
  <svg width="24" height="24" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M6 .5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5V8h4V6.5a.5.5 0 0 1 .82-.384l3 2.5a.5.5 0 0 1 0 .768l-3 2.5A.5.5 0 0 1 12 11.5V10H6.5a.5.5 0 0 1-.5-.5v-9Z" />
  </svg>
);
