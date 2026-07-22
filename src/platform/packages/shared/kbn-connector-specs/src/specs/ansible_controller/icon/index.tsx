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

/** Simplified Ansible mark for 32×32. */
export default (props: ConnectorIconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 32 32"
    width="32"
    height="32"
    role="img"
    aria-label="Ansible Control Server"
    {...props}
  >
    <circle cx="16" cy="16" r="16" fill="#EE0000" />
    <path
      fill="#fff"
      d="M9.2 22.8 16 7.5l6.8 15.3h-2.6l-1.3-3.1H13.1l-1.3 3.1H9.2zm5.1-5.4h3.4L16 11.6l-1.7 5.8z"
    />
  </svg>
);
