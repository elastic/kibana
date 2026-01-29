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

const PagerDutyIcon = (props: ConnectorIconProps) => {
  // Use square viewBox to match content height (175), content will be centered horizontally
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 175 175"
      preserveAspectRatio="xMidYMid meet"
      {...props}
    >
      <g transform="translate(27.2, 0)">
        <rect y="128.4" className="st0" width="25.7" height="46.6" style={{ fill: '#06AC38' }} />
        <path
          className="st0"
          style={{ fill: '#06AC38' }}
          d="M96.5,8.6C82.8,1.2,73.2,0,50.7,0H0v106.1h25.7H29h21.5c20,0,35-1.2,48.2-10c14.4-9.5,21.9-25.4,21.9-43.8
        C120.6,32.5,111.4,16.6,96.5,8.6z M56.4,83.9H25.7V22.7l29-0.2c26.4-0.2,39.6,9,39.6,30.1C94.3,75.3,77.9,83.9,56.4,83.9z"
        />
      </g>
    </svg>
  );
};

export default PagerDutyIcon;
