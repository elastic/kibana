/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { EuiIconProps } from '@elastic/eui';

export const IconChartGaugeSemiCircle = ({
  title,
  titleId,
  ...props
}: Omit<EuiIconProps, 'type'>) => {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-labelledby={titleId}
      {...props}
    >
      {title ? <title id={titleId}>{title}</title> : null}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M1.01894 11H2.5C2.77614 11 3 11.2239 3 11.5C3 11.7761 2.77614 12 2.5 12H0.5C0.223858 12 0 11.7761 0 11.5C0 7.35786 3.35786 4 7.5 4C11.6421 4 15 7.35786 15 11.5C15 11.7761 14.7761 12 14.5 12H12.5C12.2239 12 12 11.7761 12 11.5C12 11.2239 12.2239 11 12.5 11H13.9811C13.7257 7.64378 10.9216 5 7.5 5C4.07839 5 1.27426 7.64378 1.01894 11Z"
        fill="#343741"
      />
    </svg>
  );
};
