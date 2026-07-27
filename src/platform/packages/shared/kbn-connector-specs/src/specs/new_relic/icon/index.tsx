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
    aria-label="New Relic"
    {...props}
  >
    <rect width="32" height="32" rx="6" fill="#1CE783" />
    <path
      fill="#000"
      d="M9 11.2l7-4 7 4v9.6l-7 4-7-4v-9.6zm2 1.16v7.28l5 2.86 5-2.86v-7.28l-5-2.86-5 2.86z"
    />
    <circle cx="16" cy="16" r="2.6" fill="#000" />
  </svg>
);
