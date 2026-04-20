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

const OutlookIcon = (props: ConnectorIconProps): React.JSX.Element => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width="32"
      height="32"
      aria-hidden="true"
      {...props}
    >
      {/* Microsoft Outlook brand icon */}
      <rect width="32" height="32" rx="4" fill="#0078D4" />
      {/* Envelope shape */}
      <path
        d="M5 10.5C5 9.67 5.67 9 6.5 9h19c.83 0 1.5.67 1.5 1.5v11c0 .83-.67 1.5-1.5 1.5h-19C5.67 23 5 22.33 5 21.5v-11z"
        fill="white"
        fillOpacity="0.15"
      />
      <path d="M6.5 9.5h19l-9.5 7.5-9.5-7.5z" fill="none" stroke="white" strokeWidth="0" />
      {/* Letter O representing Outlook */}
      <text
        x="16"
        y="20"
        textAnchor="middle"
        fontFamily="Segoe UI, Arial, sans-serif"
        fontWeight="bold"
        fontSize="14"
        fill="white"
      >
        O
      </text>
    </svg>
  );
};

export default OutlookIcon;
