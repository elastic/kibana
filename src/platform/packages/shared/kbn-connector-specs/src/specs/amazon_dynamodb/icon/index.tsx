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
      fill="none"
      {...props}
    >
      <defs>
        <linearGradient
          id="dynamodb-grad"
          x1="0"
          y1="32"
          x2="32"
          y2="0"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#2E27AD" />
          <stop offset="1" stopColor="#527FFF" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="4" fill="url(#dynamodb-grad)" />
      {/* DynamoDB table / cylinder icon with lightning bolt */}
      <path
        fill="#fff"
        fillRule="evenodd"
        d="
          M20.85 24.81v-2.29c-1.22 1.04-3.75 1.73-6.82 1.73-3.07 0-5.6-.69-6.82-1.73v2.29c0 1.13 2.8 2.38 6.82 2.38 4.01 0 6.81-1.25 6.82-2.38z
          M20.85 18.3l.79-.01v.01c0 .5-.25.96-.72 1.39.58.52.72 1.03.72 1.4v3.73c0 1.81-3.27 3.18-7.61 3.18-4.31 0-7.57-1.35-7.6-3.15L6.4 24.8v-3.74l.01-.01c0-.36.14-.87.72-1.39-.57-.52-.72-1.02-.72-1.38V14.5c0-.36.15-.87.72-1.39-.57-.52-.72-1.02-.72-1.38V7.94C6.41 6.14 9.67 4.8 14 4.8c2.08 0 4.08.34 5.49.94l-.31.74c-1.31-.56-3.2-.88-5.18-.88-4.02 0-6.82 1.26-6.82 2.38 0 1.13 2.8 2.38 6.82 2.38l.32-.01.03.8-.36.01c-3.07 0-5.6-.69-6.82-1.73v2.3c.01.43.44.81.79 1.05 1.08.71 3.01 1.19 5.16 1.3l-.04.8c-2.17-.1-4.08-.57-5.31-1.28-.3.24-.6.55-.6.92 0 1.13 2.8 2.38 6.82 2.38l.6-.04.06.8c-.2.02-.41.04-.66.04-3.07 0-5.6-.69-6.82-1.73v2.28c0 .45.43.83.79 1.07 1.23.81 3.54 1.32 6.03 1.32h.17v.8h-.17c-2.53 0-4.81-.49-6.21-1.31-.31.24-.6.55-.6.92 0 1.13 2.8 2.38 6.82 2.38 4.01 0 6.81-1.25 6.82-2.38v-.01c0-.36-.29-.68-.6-.92l-.63.33-.31-.74c.43-.19.76-.39.75-.4.36-.24.79-.63.79-1.06z
          M25.09 11.54h-2.62a.39.39 0 01-.32-.17.41.41 0 01-.05-.36l1.16-3.47h-4.19l-2.49 3.6h2.53a.39.39 0 01.31.16.41.41 0 01.07.35l-2.17 8.07zm1.2-.12L16.77 22.6a.39.39 0 01-.48.07.41.41 0 01-.19-.45l2.45-9.1h-1.81a.39.39 0 01-.34-.2.41.41 0 01-.01-.39l2.51-5.72a.39.39 0 01.35-.21h6c.13 0 .25.06.32.17a.41.41 0 01.05.36l-1.16 3.47h2.99c.16 0 .3.1.36.24a.41.41 0 01-.08.43z
        "
        clipRule="evenodd"
      />
    </svg>
  );
};
