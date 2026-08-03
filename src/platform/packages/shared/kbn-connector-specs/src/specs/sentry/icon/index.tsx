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
    aria-label="Sentry"
    {...props}
  >
    <circle cx="16" cy="16" r="16" fill="#362D59" />
    <path
      fill="#fff"
      d="M16 6.4c-.7 0-1.36.38-1.72 1.02L11.2 13.1a8.6 8.6 0 0 1 5.66 8.1H14.7a6.4 6.4 0 0 0-3.36-5.4l-2.1 3.66a2.55 2.55 0 0 0 1.18 4.82H10v-2.14h.42a.41.41 0 0 0 .36-.62L17.7 9.06a.41.41 0 0 1 .72 0l7.16 12.36c.14.25-.03.62-.36.62H12.9V24h12.32a2.55 2.55 0 0 0 2.2-3.82L17.72 7.42A1.99 1.99 0 0 0 16 6.4z"
    />
  </svg>
);
