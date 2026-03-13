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
      xmlns="http://www.w3.org/2000/svg"
      width="32"
      height="32"
      viewBox="0 0 32 32"
      aria-label="HubSpot"
      {...props}
    >
      {/* HubSpot sprocket/gear logo mark */}
      <circle cx="20.5" cy="8.5" r="3.5" fill="#FF7A59" />
      <path
        d="M20.5 13.5c-1.2 0-2.3-.4-3.2-1L13 16.8v1.7c.8.5 1.4 1.3 1.7 2.3h3.8c.4-1.7 1.9-3 3.7-3 2.1 0 3.8 1.7 3.8 3.8S24.3 25.4 22.2 25.4c-1.8 0-3.3-1.3-3.7-3H14.7c-.5 1.6-2 2.8-3.7 2.8-2.1 0-3.8-1.7-3.8-3.8 0-1.8 1.3-3.4 3-3.8v-5c-1.7-.4-3-2-3-3.8C7.2 6.7 8.9 5 11 5c2.1 0 3.8 1.7 3.8 3.8 0 .8-.2 1.5-.6 2.1l4.3 4.3c.6-.5 1.3-.7 2-.7z"
        fill="#33475B"
      />
    </svg>
  );
};
