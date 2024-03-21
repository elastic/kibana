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

export const IconChartGaugeArc = ({ title, titleId, ...props }: Omit<EuiIconProps, 'type'>) => {
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
        d="M5.9,20.7c-0.5,0-1-0.2-1.3-0.7c-1.2-1.9-1.9-4.2-1.9-6.5C2.8,6.8,8.3,1.3,15,1.3c5.3,0,10.2,3.6,11.7,8.7
	c0.2,0.8-0.2,1.6-1,1.9c-0.8,0.2-1.6-0.2-1.9-1C22.7,7,19,4.3,15,4.3c-5.1,0-9.2,4.1-9.2,9.2c0,1.7,0.5,3.4,1.4,4.9
	c0.4,0.7,0.2,1.6-0.5,2.1C6.5,20.6,6.2,20.7,5.9,20.7z"
      />
      <g className={colors.subdued}>
        <path d="M10,18.6l0.8-0.6l-0.6-0.8l-1.5,1.2l0,0.1C9,18.9,9.6,18.9,10,18.6z" />
        <path d="M19.2,18l0.8,0.6c0.4,0.3,1,0.3,1.3-0.2v0l-1.5-1.2L19.2,18z" />
        <path
          d="M21.3,18.5l-1.6-1.2c0.9-1.1,1.3-2.4,1.3-3.8c0-3.3-2.7-6-6-6c-3.3,0-6,2.7-6,6c0,1.3,0.4,2.6,1.3,3.7
		l-1.6,1.2C7.5,17,7,15.3,7,13.5c0-4.4,3.6-8,8-8c4.4,0,8,3.6,8,8C23,15.3,22.4,17.1,21.3,18.5z"
        />
        <path className="st2" d="M25.5,11.3" />
        <g>
          <path d="M10.7,18.1l0.7-0.5c0.4-0.3,0.4-0.9,0.1-1.2c-0.3-0.4-0.9-0.4-1.2-0.1l-0.7,0.5" />
          <path d="M8.7,13l0.9,0.2c0.5,0.1,0.9-0.2,1-0.7s-0.2-0.9-0.7-1l-0.9-0.2" />
          <path d="M11.5,8.3l0.4,0.8c0.2,0.4,0.7,0.6,1.2,0.4c0.4-0.2,0.6-0.7,0.4-1.2l-0.4-0.8" />
          <path d="M16.9,7.5l-0.4,0.8c-0.2,0.4,0,1,0.4,1.2s1,0,1.2-0.4l0.4-0.8" />
          <path d="M20.9,11.3L20,11.5c-0.5,0.1-0.8,0.6-0.7,1s0.6,0.8,1,0.7l0.9-0.2" />
          <path d="M20.4,16.7l-0.7-0.5c-0.4-0.3-0.9-0.2-1.2,0.1c-0.3,0.4-0.2,0.9,0.1,1.2l0.7,0.5" />
        </g>
      </g>
    </svg>
  );
};
