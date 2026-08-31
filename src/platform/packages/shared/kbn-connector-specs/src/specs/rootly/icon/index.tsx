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
    aria-label="Rootly"
    {...props}
  >
    <circle cx="16" cy="16" r="16" fill="#573DFF" />
    <path
      fill="#fff"
      d="M16 7a9 9 0 1 0 9 9 9 9 0 0 0-9-9zm0 15.4A6.4 6.4 0 1 1 22.4 16 6.4 6.4 0 0 1 16 22.4z"
    />
    <circle cx="16" cy="16" r="3.2" fill="#fff" />
  </svg>
);
