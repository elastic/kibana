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
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="32" height="32" {...props}>
      <path d="M152.637 43.363h13.068l-27.057 27.057v-13.069z" fill="#EA4335" />
      <path
        d="M43.363 152.637V43.363c0-8.478 6.885-15.363 15.363-15.363h80.278L43.363 123.642z"
        fill="#4285F4"
      />
      <path
        d="M152.637 43.363L139.004 57.35l-95.641 95.287h109.274c8.478 0 15.363-6.885 15.363-15.363V43.363z"
        fill="#FBBC04"
      />
      <path d="M43.363 123.642V152.637l27.057-27.057z" fill="#34A853" />
      <path
        d="M70.42 125.58L43.363 152.637h109.274c8.478 0 15.363-6.885 15.363-15.363V43.363h-13.068L70.42 125.58z"
        fill="#188038"
        opacity="0.2"
      />
      <path
        d="M139.004 57.35L43.363 152.637V43.363c0-8.478 6.885-15.363 15.363-15.363h80.278z"
        fill="#1967D2"
        opacity="0.2"
      />
      <rect x="56" y="56" width="88" height="88" rx="4" fill="white" />
      <rect x="56" y="56" width="88" height="22" rx="4" fill="#4285F4" />
      <circle cx="76" cy="67" r="3" fill="white" />
      <circle cx="124" cy="67" r="3" fill="white" />
      <text
        x="100"
        y="122"
        fontFamily="Google Sans, Roboto, Arial, sans-serif"
        fontSize="42"
        fontWeight="500"
        fill="#70757A"
        textAnchor="middle"
      >
        31
      </text>
    </svg>
  );
};
