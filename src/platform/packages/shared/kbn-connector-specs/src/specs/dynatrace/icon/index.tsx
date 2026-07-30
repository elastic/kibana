/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React from 'react';
import type { ConnectorIconProps } from '../../../types';

export default (props: ConnectorIconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 32 32"
    width="32"
    height="32"
    role="img"
    aria-label="Dynatrace"
    {...props}
  >
    <rect width="32" height="32" rx="6" fill="#1496FF" />
    <path
      fill="#fff"
      d="M8.5 22.5V9.5h5.2c3.4 0 5.5 1.9 5.5 4.7 0 2.9-2.1 4.8-5.5 4.8H11.8v3.5H8.5zm3.3-6.2h1.7c1.5 0 2.4-.8 2.4-2.1s-.9-2.1-2.4-2.1h-1.7v4.2zM20.2 22.5l3.6-13h3.5l-3.6 13h-3.5z"
    />
  </svg>
);
