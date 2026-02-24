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
 * Zendesk-style support/headset icon (simplified).
 * Zendesk brand uses green (#03363d); this uses a neutral dark fill for contrast in Kibana.
 */
export default (props: ConnectorIconProps) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      {...props}
    >
      <path
        fill="currentColor"
        d="M16 4C10.477 4 6 8.477 6 14v2a2 2 0 0 0 2 2h2v4a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-4h2a2 2 0 0 0 2-2v-2c0-5.523-4.477-10-10-10Zm0 2a8 8 0 0 1 8 8h-2a6 6 0 0 0-12 0H8a8 8 0 0 1 8-8Zm-4 10v2h8v-2h-8Z"
      />
    </svg>
  );
};
