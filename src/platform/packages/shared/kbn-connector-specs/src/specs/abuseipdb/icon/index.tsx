/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { createBrandIcon } from '../../../brand_icon';

// Flattened to the silhouette plus the prohibition sign: the source artwork's
// gradient shading is invisible at 16px, and a single fill is what lets the mark
// reverse on dark surfaces instead of disappearing behind the red ring.
const AbuseIpDbIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 162.18 162.18" {...props}>
    <g transform="translate(-16.984 -331)" fillRule="evenodd">
      <path d="m48.388 396.53c0.9599-4.2739 1.9198-33.716 10.559-33.241 30.717 0.94974 62.394-30.867 85.432 39.89 71.033 33.241 4.9391 59.953-51.295 57.579-55.567-2.3264-103.01-42.383-44.696-64.227z" />
      <path
        transform="matrix(1.0215 0 0 .99183 -1.0406 3.2411)"
        d="m48.388 396.53c-30.511 40.982-1.0945 30.276 44.696 64.228-55.567-2.3264-103.01-42.383-44.696-64.227z"
      />
    </g>
    <circle cx="81.091" cy="81.091" r="75.091" fill="none" stroke="#F00" strokeWidth="12" />
    <path d="m26.794 25.237 105.89 112.79" fill="none" stroke="#F00" strokeWidth="12" />
  </svg>
);

// The mark is black on light surfaces; the red ring keeps its own color.
export default createBrandIcon(AbuseIpDbIcon, '#000000');
