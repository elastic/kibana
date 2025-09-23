/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { css } from '@emotion/react';
import type { UseEuiTheme } from '@elastic/eui';

const dscNoResultsIllustrationDecorCss = ({ colorMode }: UseEuiTheme) => css`
  fill: ${colorMode === 'LIGHT' ? '#E6EBF2' : '#294492'}}
`;

const dscNoResultsIllustrationFlyCss = ({ colorMode }: UseEuiTheme) => css`
  fill: ${colorMode === 'LIGHT' ? '#294492' : '#E6EBF2'}}
`;

export const NoResultsIllustration = () => (
  <svg
    width="200"
    height="200"
    viewBox="0 0 128 128"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M102.86 20.56H21.83C18.7538 20.56 16.26 23.0538 16.26 26.13V101.07C16.26 104.146 18.7538 106.64 21.83 106.64H102.86C105.936 106.64 108.43 104.146 108.43 101.07V26.13C108.43 23.0538 105.936 20.56 102.86 20.56Z"
      fill="#153385"
      stroke="#101C3F"
      strokeMiterlimit="10"
    />
    <path
      d="M105.54 20.5H24.5099C21.4337 20.5 18.9399 22.9938 18.9399 26.07V101.01C18.9399 104.086 21.4337 106.58 24.5099 106.58H105.54C108.616 106.58 111.11 104.086 111.11 101.01V26.07C111.11 22.9938 108.616 20.5 105.54 20.5Z"
      fill="#0B64DD"
    />
    <path
      d="M105.54 20.5H24.5099C21.4337 20.5 18.9399 22.9938 18.9399 26.07V101.01C18.9399 104.086 21.4337 106.58 24.5099 106.58H105.54C108.616 106.58 111.11 104.086 111.11 101.01V26.07C111.11 22.9938 108.616 20.5 105.54 20.5Z"
      stroke="#101C3F"
      strokeMiterlimit="10"
    />
    <path d="M19.01 35.96H110.93" stroke="#101C3F" strokeMiterlimit="10" />
    <path
      d="M39.37 26.93H28.69C27.613 26.93 26.74 27.803 26.74 28.88V29.17C26.74 30.2469 27.613 31.12 28.69 31.12H39.37C40.4469 31.12 41.32 30.2469 41.32 29.17V28.88C41.32 27.803 40.4469 26.93 39.37 26.93Z"
      fill="white"
    />
    <path
      d="M114.99 53.04H11.86C7.79518 53.04 4.5 56.3352 4.5 60.4V76.2C4.5 80.2648 7.79518 83.56 11.86 83.56H114.99C119.055 83.56 122.35 80.2648 122.35 76.2V60.4C122.35 56.3352 119.055 53.04 114.99 53.04Z"
      fill="#153385"
      stroke="#101C3F"
      strokeMiterlimit="10"
    />
    <path
      d="M114.99 49.82H11.86C7.79518 49.82 4.5 53.1152 4.5 57.18V72.98C4.5 77.0448 7.79518 80.34 11.86 80.34H114.99C119.055 80.34 122.35 77.0448 122.35 72.98V57.18C122.35 53.1152 119.055 49.82 114.99 49.82Z"
      fill="white"
      stroke="#101C3F"
      strokeMiterlimit="10"
    />
    <path
      d="M57.2901 59.28C65.2501 56.35 72.6401 59.48 76.6501 65.06C64.6501 55.28 45.9301 66.82 47.7801 81.82C48.0801 84.27 48.9401 86.51 50.2101 88.45C47.4401 86.1 45.4901 82.67 45.0501 78.13C44.2601 69.93 49.6601 62.08 57.2901 59.27V59.28Z"
      fill="#101C3F"
      stroke="#101C3F"
      strokeMiterlimit="10"
    />
    <path
      d="M39.41 79.63C40.93 91.87 52.73 99.84 64.64 97.94C84.28 94.82 94.45 66.98 75.37 55.59C58.86 45.73 37.13 60.94 39.41 79.63ZM74.46 62.13C86.88 72.94 76.12 92.85 60.99 92.58C53.01 92.44 46.08 86.58 45.1 78.57C43.23 63.36 62.46 51.68 74.46 62.12V62.13Z"
      fill="#48EFCF"
      stroke="#101C3F"
      strokeMiterlimit="10"
    />
    <path
      d="M64.6401 97.94C79.9101 95.51 89.4401 78.16 83.9801 65.2C88.6301 71.58 89.9201 80.39 85.0201 88.88C76.2801 104.03 52.8101 105.35 44.7101 91.06C49.5801 96.37 57.0801 99.14 64.6401 97.94Z"
      fill="#153385"
      stroke="#101C3F"
      strokeMiterlimit="10"
    />
    <path
      d="M95.4175 120.801L95.8764 120.446C97.6505 119.075 97.9772 116.525 96.6059 114.751L81.3545 95.0177C79.9832 93.2435 77.4334 92.9169 75.6593 94.2881L75.2004 94.6428C73.4262 96.014 73.0996 98.5638 74.4708 100.338L89.7223 120.071C91.0935 121.845 93.6433 122.172 95.4175 120.801Z"
      fill="#153385"
      stroke="#101C3F"
      strokeMiterlimit="10"
    />
    <path
      d="M96.6267 119.87L97.0856 119.516C98.8597 118.144 99.1864 115.595 97.8152 113.82L82.5637 94.0874C81.1925 92.3132 78.6427 91.9866 76.8685 93.3578L76.4096 93.7125C74.6355 95.0837 74.3088 97.6335 75.68 99.4076L90.9315 119.141C92.3027 120.915 94.8526 121.242 96.6267 119.87Z"
      fill="#48EFCF"
      stroke="#101C3F"
      strokeMiterlimit="10"
    />
    <path d="M16.26 54.98V75.42" stroke="#101C3F" strokeMiterlimit="10" />
  </svg>
);
