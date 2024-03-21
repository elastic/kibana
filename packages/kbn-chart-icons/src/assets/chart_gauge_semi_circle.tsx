/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { EuiIconProps } from '@elastic/eui';
import { colors } from './common_styles';

export const IconChartGaugeSemiCircle = ({
  title,
  titleId,
  ...props
}: Omit<EuiIconProps, 'type'>) => {
  return (
    <svg
      width="30"
      height="22"
      viewBox="0 0 30 22"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-labelledby={titleId}
      {...props}
    >
      {title ? <title id={titleId}>{title}</title> : null}
      <path
        className={colors.accent}
        d="M3,17.9c-0.8,0-1.5-0.7-1.5-1.5c0-3.1,1.1-6.1,3-8.5C7.1,4.7,11,2.9,15.1,2.9c3.4,0,6.7,1.3,9.2,3.6
	C24.9,7.1,25,8,24.4,8.6c-0.6,0.6-1.5,0.6-2.1,0.1c-2-1.8-4.5-2.8-7.2-2.8c-3.2,0-6.2,1.4-8.2,3.9c-1.5,1.9-2.3,4.2-2.3,6.6
	C4.5,17.3,3.9,17.9,3,17.9z"
      />
      <g className={colors.subdued}>
        <path
          d="M24.3,16.7h-2c0-4-3.3-7.3-7.3-7.3c-2.2,0-4.3,1-5.7,2.7c-1.1,1.3-1.6,2.9-1.6,4.6h-2c0-2.1,0.7-4.2,2.1-5.8
		c1.8-2.2,4.4-3.5,7.3-3.5C20.1,7.3,24.3,11.5,24.3,16.7z"
        />
        <g>
          <path d="M7.6,17.6h1c0.6,0,1-0.4,1-1c0-0.6-0.4-1-1-1h-1" />
        </g>
        <g>
          <path d="M14.2,8.8l0,1c0,0.6,0.4,1,1,1c0.6,0,1-0.4,1-1v-1" />
        </g>
        <g>
          <path d="M8.9,11.9l0.7,0.7c0.4,0.4,1,0.4,1.4,0c0.4-0.4,0.4-1,0-1.4l-0.7-0.7" />
        </g>
        <g>
          <path d="M19.6,10.5l-0.7,0.7c-0.4,0.4-0.4,1,0,1.4c0.4,0.4,1,0.4,1.4,0l0.7-0.7" />
        </g>
        <g>
          <path d="M22.4,15.6h-1c-0.6,0-1,0.4-1,1c0,0.6,0.4,1,1,1h1" />
        </g>
        <path d="M6.6,17.6h1v-1H5.7l0,0C5.7,17.1,6.1,17.6,6.6,17.6z" />
        <path d="M22.4,17.6h1c0.5,0,1-0.4,1-1v0h-1.9V17.6z" />
      </g>
    </svg>
  );
};
