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
        d="M3 17.9c-.8 0-1.5-.7-1.5-1.5 0-3.1 1.1-6.1 3-8.5 2.6-3.2 6.5-5 10.6-5 3.4 0 6.7 1.3 9.2 3.6.6.6.7 1.5.1 2.1-.6.6-1.5.6-2.1.1-2-1.8-4.5-2.8-7.2-2.8-3.2 0-6.2 1.4-8.2 3.9-1.5 1.9-2.3 4.2-2.3 6.6-.1.9-.7 1.5-1.6 1.5z"
      />
      <g className={colors.subdued}>
        <path d="M24.3 16.7h-2c0-4-3.3-7.3-7.3-7.3-2.2 0-4.3 1-5.7 2.7-1.1 1.3-1.6 2.9-1.6 4.6h-2c0-2.1.7-4.2 2.1-5.8 1.8-2.2 4.4-3.5 7.3-3.5 5-.1 9.2 4.1 9.2 9.3z" />
        <path d="M7.5 17.6h1c.6 0 1-.4 1-1s-.4-1-1-1h-1m6.7-6.8v1c0 .6.4 1 1 1s1-.4 1-1v-1m-7.3 3.1.7.7c.4.4 1 .4 1.4 0 .4-.4.4-1 0-1.4l-.7-.7m9.3 0-.7.7c-.4.4-.4 1 0 1.4.4.4 1 .4 1.4 0l.7-.7m1.55 3.7h-1c-.6 0-1 .4-1 1s.4 1 1 1h1" />
        <path d="M6.6 17.6h1v-1H5.7c0 .5.4 1 .9 1zm15.8 0h1c.5 0 1-.4 1-1h-1.9v1z" />
      </g>
    </svg>
  );
};
