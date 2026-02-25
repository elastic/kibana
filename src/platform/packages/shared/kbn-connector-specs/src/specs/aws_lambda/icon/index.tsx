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
      width="80px"
      height="80px"
      viewBox="0 0 80 80"
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <title>Icon-Architecture/64/Arch_AWS-Lambda_64</title>
      <desc>AWS Lambda</desc>
      <defs>
        <linearGradient x1="0%" y1="100%" x2="100%" y2="0%" id="lambdaGradient">
          <stop stopColor="#C8511B" offset="0%" />
          <stop stopColor="#FF9900" offset="100%" />
        </linearGradient>
      </defs>
      <g
        id="Icon-Architecture/64/Arch_AWS-Lambda_64"
        stroke="none"
        strokeWidth="1"
        fill="none"
        fillRule="evenodd"
      >
        <g id="Icon-Architecture-BG/64/Compute" fill="url(#lambdaGradient)">
          <rect id="Rectangle" x="0" y="0" width="80" height="80" />
        </g>
        <path
          d="M28.0075,66 L17.508,66 L30.468,36.592 L35.68,47.666 L28.0075,66 Z M31.1075,33 L30.8885,33 C30.5765,33.006 30.2975,33.199 30.1705,33.489 L15.0895,67.493 C14.9825,67.735 14.9995,68.015 15.1345,68.241 C15.2695,68.468 15.5055,68.611 15.7645,68.624 L28.5115,68 C28.8405,67.999 29.1345,67.8 29.2555,67.498 L37.2365,47.266 C37.3185,47.059 37.3105,46.827 37.2155,46.626 L31.1075,33 Z M62.9155,67.489 C62.7985,67.79 62.5075,67.989 62.1825,68 L51.4905,68 C51.1745,67.997 50.8895,67.809 50.7595,67.523 L32.2555,26.478 C32.1255,26.192 31.8395,26.003 31.5235,26 L25.7235,26 L25.7235,24 L32.0415,24 C32.3575,24.003 32.6425,24.192 32.7725,24.478 L51.2775,65.523 C51.4075,65.808 51.6925,65.997 52.0085,66 L61.6935,66 L54.0765,47.273 C53.9695,47.018 53.9955,46.727 54.1465,46.495 L63.0945,32.495 C63.2635,32.232 63.5655,32.093 63.8705,32.138 C64.1755,32.183 64.4265,32.404 64.5095,32.7 L64.9255,34.153 C64.9875,34.371 64.9595,34.605 64.8485,34.802 L56.5895,47.726 L64.8575,67.065 C64.9825,67.357 64.9565,67.693 64.7885,67.961 C64.6205,68.228 64.3345,68.390 64.0245,68.397 L62.9155,67.489 Z"
          id="AWS-Lambda_Icon_64_Squid"
          fill="#FFFFFF"
        />
      </g>
    </svg>
  );
};
