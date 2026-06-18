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

/**
 * MongoDB leaf logo SVG icon.
 * Derived from MongoDB's brand colors (green #00ED64, dark #001E2B).
 */
export default (props: ConnectorIconProps) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width="32"
      height="32"
      aria-label="MongoDB"
      {...props}
    >
      {/* MongoDB leaf mark */}
      <path
        d="M16 2C11.5 2 8 7.5 8 13.5c0 4.5 2.5 8.5 6 10.5V28c0 .6.4 1 1 1h2c.6 0 1-.4 1-1v-4c3.5-2 6-6 6-10.5C24 7.5 20.5 2 16 2z"
        fill="#00ED64"
      />
      <path
        d="M16 2C11.5 2 8 7.5 8 13.5c0 4.5 2.5 8.5 6 10.5V28c0 .6.4 1 1 1h1V2h-1z"
        fill="#00684A"
      />
    </svg>
  );
};
