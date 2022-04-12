/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiIconProps } from '@elastic/eui';
import { useCommonChartStyles } from '../../../../charts/public';

export const PieIcon = ({ title, titleId, ...props }: Omit<EuiIconProps, 'type'>) => {
  const { chartIcon } = useCommonChartStyles();

  return (
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
        d="M17.827 21.189a10.001 10.001 0 005.952-7.148c.124-.578-.343-1.091-.935-1.091H14a1 1 0 01-1-1V3.106c0-.592-.513-1.059-1.092-.935a10 10 0 105.919 19.018z"
        css={chartIcon.subdued}
      />
      <path
        d="M22.462 3.538A12.29 12.29 0 0016.094.16C15.512.048 15 .514 15 1.106V10a1 1 0 001 1h8.895c.591 0 1.057-.512.945-1.094a12.288 12.288 0 00-3.378-6.368z"
        css={chartIcon.accent}
      />
    </svg>
  );
};
