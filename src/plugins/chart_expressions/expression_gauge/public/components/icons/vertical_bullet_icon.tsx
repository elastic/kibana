/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { EuiIconProps } from '@elastic/eui';
import { useCommonChartStyles } from '../../../../../charts/public';

export const VerticalBulletIcon = ({ title, titleId, ...props }: Omit<EuiIconProps, 'type'>) => {
  const { chartIcon } = useCommonChartStyles();

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
        css={chartIcon.subdued}
        d="M16 22a1 1 0 01-1-1V4a1 1 0 011-1h4a1 1 0 011 1v17a1 1 0 01-1 1h-4z"
      />
      <path
        css={chartIcon.accent}
        d="M10 0h2a1 1 0 011 1v20a1 1 0 01-1 1h-2a1 1 0 110-2h1v-3h-1a1 1 0 110-2h1v-3h-1a1 1 0 110-2h1V7h-1a1 1 0 010-2h1V2h-1a1 1 0 010-2z"
      />
    </svg>
  );
};
