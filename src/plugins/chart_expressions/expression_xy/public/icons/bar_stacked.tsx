/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiIconProps } from '@elastic/eui';

export const BarStackedIcon = ({ title, titleId, ...props }: Omit<EuiIconProps, 'type'>) => (
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
      className="lensChartIcon__subdued"
      d="M6 13v8a1 1 0 01-1 1H1a1 1 0 01-1-1v-8h6zm8-4v12a1 1 0 01-1 1H9a1 1 0 01-1-1V9h6zm8 4v8a1 1 0 01-1 1h-4a1 1 0 01-1-1v-8h6zm8 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1v-7h6z"
    />
    <path
      d="M29 1a1 1 0 011 1v10h-6V2a1 1 0 011-1h4zM5 7a1 1 0 011 1v3H0V8a1 1 0 011-1h4zm16-4a1 1 0 011 1v7h-6V4a1 1 0 011-1h4zm-8-3a1 1 0 011 1v6H8V1a1 1 0 011-1h4z"
      className="lensChartIcon__accent"
    />
  </svg>
);
