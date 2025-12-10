/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

interface LogoProps {
  [key: string]: unknown;
}

const Logo = (props: LogoProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="32"
    height="32"
    viewBox="0 0 16 16"
    fill="none"
    {...props}
  >
    <path
      d="M14.5 13L12 10.5M14.5 13L12 15.5M14.5 13H4C2.61929 13 1.5 11.8807 1.5 10.5V10.5C1.5 9.11929 2.61929 8 4 8H6.5M4.5 3V2C4.5 1.72386 4.27614 1.5 4 1.5H2C1.72386 1.5 1.5 1.72386 1.5 2V4C1.5 4.27614 1.72386 4.5 2 4.5H4C4.27614 4.5 4.5 4.27614 4.5 4V3ZM4.5 3H12C13.3807 3 14.5 4.11929 14.5 5.5V5.5C14.5 6.88071 13.3807 8 12 8H9.5M6.5 8V7C6.5 6.72386 6.72386 6.5 7 6.5H9C9.27614 6.5 9.5 6.72386 9.5 7V8M6.5 8V9C6.5 9.27614 6.72386 9.5 7 9.5H9C9.27614 9.5 9.5 9.27614 9.5 9V8"
      stroke="currentColor"
      strokeWidth="1"
      fill="none"
    />
  </svg>
);

// eslint-disable-next-line import/no-default-export
export { Logo as default };
