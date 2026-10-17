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

/** Argo CD mark (black octopus on orange), simplified for 32×32. */
export default (props: ConnectorIconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 32 32"
    width="32"
    height="32"
    role="img"
    aria-label="Argo CD"
    {...props}
  >
    <rect width="32" height="32" rx="6" fill="#EF7B4D" />
    <path
      fill="#0B0B0B"
      d="M16 6.2c-3.7 0-6.4 2.3-6.4 6.2 0 2.3 1.1 4.1 2.8 5.2l-.7 5.3c-.1.6.4 1.1 1 1.1h6.6c.6 0 1.1-.5 1-1.1l-.7-5.3c1.7-1.1 2.8-2.9 2.8-5.2 0-3.9-2.7-6.2-6.4-6.2zm0 2.2c2.3 0 3.9 1.4 3.9 4 0 2.5-1.6 4-3.9 4s-3.9-1.5-3.9-4c0-2.6 1.6-4 3.9-4zm-2.2 14.1c0-.6.5-1.1 1.1-1.1h2.2c.6 0 1.1.5 1.1 1.1s-.5 1.1-1.1 1.1h-2.2c-.6 0-1.1-.5-1.1-1.1z"
    />
  </svg>
);
