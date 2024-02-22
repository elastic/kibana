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

export const IconChartGaugeCircle = ({ title, titleId, ...props }: Omit<EuiIconProps, 'type'>) => {
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
        d="M5.9,20.3c-0.5,0-1-0.2-1.3-0.7c-1.2-1.9-1.9-4.2-1.9-6.5C2.8,6.4,8.3,0.9,15,0.9c5.3,0,10.2,3.6,11.7,8.7
	c0.2,0.8-0.2,1.6-1,1.9c-0.8,0.2-1.6-0.2-1.9-1C22.7,6.6,19,3.9,15,3.9c-5.1,0-9.2,4.1-9.2,9.2c0,1.7,0.5,3.4,1.4,4.9
	c0.4,0.7,0.2,1.6-0.5,2.1C6.5,20.2,6.2,20.3,5.9,20.3z"
      />
      <g className={colors.subdued}>
        <path
          d="M15,21.1c-4.4,0-8-3.6-8-8c0-4.4,3.6-8,8-8c4.4,0,8,3.6,8,8C23,17.5,19.4,21.1,15,21.1z M15,7.1
		c-3.3,0-6,2.7-6,6c0,3.3,2.7,6,6,6c3.3,0,6-2.7,6-6C21,9.8,18.3,7.1,15,7.1z"
        />
        <path d="M15.9,19.3l0-0.9c0-0.5-0.4-0.9-0.9-0.9c-0.5,0-0.9,0.4-0.9,0.9l0,0.9" />
        <path d="M10.7,17.6l0.7-0.5c0.4-0.3,0.4-0.9,0.1-1.2c-0.3-0.4-0.9-0.4-1.2-0.1l-0.7,0.5" />
        <path d="M8.7,12.6l0.9,0.2c0.5,0.1,0.9-0.2,1-0.7s-0.2-0.9-0.7-1l-0.9-0.2" />
        <path d="M11.5,7.9l0.4,0.8c0.2,0.4,0.7,0.6,1.2,0.4c0.4-0.2,0.6-0.7,0.4-1.2l-0.4-0.8" />
        <path d="M16.9,7.1l-0.4,0.8c-0.2,0.4,0,1,0.4,1.2s1,0,1.2-0.4l0.4-0.8" />
        <path d="M20.9,10.9L20,11c-0.5,0.1-0.8,0.6-0.7,1s0.6,0.8,1,0.7l0.9-0.2" />
        <path d="M20.4,16.3l-0.7-0.5c-0.4-0.3-0.9-0.2-1.2,0.1c-0.3,0.4-0.2,0.9,0.1,1.2l0.7,0.5" />
      </g>
    </svg>
  );
};
