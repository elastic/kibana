/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiIconProps } from '@elastic/eui';

export const AreaIcon = ({ title, titleId, ...props }: Omit<EuiIconProps, 'type'>) => (
  <svg
    viewBox="0 0 30 22"
    width={30}
    height={22}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-labelledby={titleId}
    {...props}
  >
    {title ? <title id={titleId}>{title}</title> : null}
    <path
      d="M30 6v15a1 1 0 01-1 1H1a1 1 0 01-1-1v-2c1 0 3.5-4 6-4s5 3 6 3 3.23-6.994 5.865-6.997C20.5 11 23 11 24 11s3-5 6-5z"
      className="lensChartIcon__accent"
    />
    <path
      d="M6 1c3 0 5 6 6 6s3.5-3 6-3c1.667 0 2.944 2.333 3.833 6.999l.309.001c-1.013 0-2.27 0-3.593.002h-.684C15.231 11.007 13 18 12 18s-3.5-3-6-3-5 4-6 4V7c1-1.5 3-6 6-6z"
      className="lensChartIcon__subdued"
    />
  </svg>
);
