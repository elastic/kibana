/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { EuiIconProps } from '@elastic/eui';
import { useCommonChartStyles } from '@kbn/charts-plugin/public';

export const HorizontalBulletIcon = ({ title, titleId, ...props }: Omit<EuiIconProps, 'type'>) => {
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
        d="M1 13a1 1 0 00-1 1v2a1 1 0 102 0v-1h5v1a1 1 0 102 0v-1h5v1a1 1 0 102 0v-1h5v1a1 1 0 102 0v-1h5v1a1 1 0 102 0v-2a1 1 0 00-1-1H1z"
      />
      <path
        css={chartIcon.accent}
        d="M0 6a1 1 0 011-1h24a1 1 0 011 1v4a1 1 0 01-1 1H1a1 1 0 01-1-1V6z"
      />
    </svg>
  );
};
