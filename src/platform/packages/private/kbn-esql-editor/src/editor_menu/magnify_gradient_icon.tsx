/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React from 'react';

const GRADIENT_ID = 'esqlMagnifyGradient';

export const MagnifyGradientIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 16 16" width="16" height="16" role="img" {...props}>
    <defs>
      <linearGradient id={GRADIENT_ID} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="18.35%" stopColor="rgb(97, 162, 255)" />
        <stop offset="51.95%" stopColor="rgb(138, 130, 232)" />
        <stop offset="88.68%" stopColor="rgb(216, 70, 187)" />
        <stop offset="112.9%" stopColor="rgb(255, 39, 165)" />
      </linearGradient>
    </defs>
    <path
      d="M6.75 1.5a5.25 5.25 0 1 0 3.259 9.39l3.2 3.2a.75.75 0 1 0 1.061-1.06l-3.2-3.2A5.25 5.25 0 0 0 6.75 1.5zm0 1.5a3.75 3.75 0 1 1 0 7.5 3.75 3.75 0 0 1 0-7.5z"
      fill={`url(#${GRADIENT_ID})`}
    />
  </svg>
);
