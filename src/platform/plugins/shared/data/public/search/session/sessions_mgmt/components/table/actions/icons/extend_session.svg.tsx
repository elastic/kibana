/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FunctionComponent, SVGProps } from 'react';
import React from 'react';

export const ExtendSessionSvg: FunctionComponent<SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 16" {...props}>
    <path
      fill="currentColor"
      fillRule="evenodd"
      d="m14 5-3-2v1.333H4v1.334h7V7zM0 11.5A1.5 1.5 0 0 1 1.5 10h13a1.5 1.5 0 1 1 0 3h-13A1.5 1.5 0 0 1 0 11.5m14.5-.5H11v1h3.5a.5.5 0 1 0 0-1"
      clipRule="evenodd"
    />
  </svg>
);
