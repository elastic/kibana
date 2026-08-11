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

export default (props: ConnectorIconProps) => {
  return (
    <svg
      width="16px"
      height="16px"
      viewBox="0 -12.5 256 256"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid"
      fill="none"
      {...props}
    >
      <path
        d="M252.926 103.237L200.327 11.76A22.636 22.636 0 00180.608 0H75.391a22.636 22.636 0 00-19.72 11.76L3.053 102.997a22.636 22.636 0 000 22.88l52.599 91.997a22.636 22.636 0 0019.72 12.18h105.216a22.636 22.636 0 0019.74-12.12l52.598-91.477a22.636 22.636 0 000-23.22z"
        fill="#4285F4"
      />
      <polygon
        fill="#FFFFFF"
        points="88.829 165.479 99.368 154.939 83.569 139.141 83.569 89.971 99.368 74.173 88.829 63.633 67.731 84.732 67.731 144.38"
      />
      <circle fill="#FFFFFF" cx="105.146" cy="114.556" r="7.471" />
      <circle fill="#FFFFFF" cx="127.499" cy="114.556" r="7.471" />
      <circle fill="#FFFFFF" cx="149.852" cy="114.556" r="7.471" />
      <polygon
        fill="#FFFFFF"
        points="166.069 63.633 155.53 74.173 171.329 89.971 171.329 139.141 155.53 154.939 166.069 165.479 187.168 144.38 187.168 84.732"
      />
    </svg>
  );
};
