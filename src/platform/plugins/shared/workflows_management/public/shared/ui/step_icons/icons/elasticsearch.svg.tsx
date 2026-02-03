/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

export const ElasticsearchLogo = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="32"
    height="32"
    viewBox="0 0 32 32"
    className="euiIcon eui-alignMiddle website-css-1y07kvj-euiIcon-xl"
    role="img"
    aria-hidden="true"
  >
    <g fill="none" fillRule="evenodd">
      <path
        d="M2 16c0 1.384.194 2.72.524 4H22a4 4 0 0 0 0-8H2.524A15.984 15.984 0 0 0 2 16"
        className="euiIcon__fillNegative"
      />
      <path
        fill="#FEC514"
        d="M28.924 7.662A15.381 15.381 0 0 0 30.48 6C27.547 2.346 23.05 0 18 0 11.679 0 6.239 3.678 3.644 9H25.51a5.039 5.039 0 0 0 3.413-1.338"
      />
      <path
        fill="#00BFB3"
        d="M25.51 23H3.645C6.24 28.323 11.679 32 18 32c5.05 0 9.547-2.346 12.48-6a15.381 15.381 0 0 0-1.556-1.662A5.034 5.034 0 0 0 25.51 23"
      />
    </g>
  </svg>
);
