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
    aria-label="Grafana"
    {...props}
  >
    <circle cx="16" cy="16" r="16" fill="#F46800" />
    <path
      fill="#fff"
      d="M23.4 14.1c-.03-.34-.08-.73-.18-1.16a6.4 6.4 0 0 0-.55-1.44c.4-.53.68-1.14.68-1.14l-1.66-1.83s-.6.31-1.13.72a6.5 6.5 0 0 0-1.44-.6 8.5 8.5 0 0 0-.28-1.24L16.02 6l-2.83 1.4s-.15.55-.28 1.24c-.5.15-1 .35-1.44.6-.53-.4-1.13-.72-1.13-.72L8.68 10.36s.28.6.68 1.14a6.4 6.4 0 0 0-.55 1.44c-.1.42-.15.82-.18 1.16-.55.24-1.1.6-1.1.6v3.14s.62.28 1.14.44c.03.35.08.75.19 1.18.14.53.34 1.02.55 1.44-.4.53-.68 1.14-.68 1.14l1.66 1.83s.6-.31 1.13-.72c.44.25.94.45 1.44.6.13.68.28 1.24.28 1.24L16 26l2.83-1.4s.15-.55.28-1.24c.5-.15 1-.35 1.44-.6.53.4 1.13.72 1.13.72l1.66-1.83s-.28-.6-.68-1.14c.21-.42.41-.9.55-1.44.11-.43.16-.83.19-1.18.52-.16 1.14-.44 1.14-.44v-3.14s-.55-.36-1.1-.6zM16 20.75a4.75 4.75 0 1 1 0-9.5 4.75 4.75 0 0 1 0 9.5z"
    />
    <circle cx="16" cy="16" r="2.3" fill="#fff" />
  </svg>
);
