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
    aria-label="PostHog"
    {...props}
  >
    <rect width="32" height="32" rx="6" fill="#000" />
    <circle cx="11" cy="12" r="3.4" fill="#F9BD2B" />
    <circle cx="21" cy="12" r="3.4" fill="#F54E00" />
    <circle cx="16" cy="21" r="3.4" fill="#1D4AFF" />
  </svg>
);
