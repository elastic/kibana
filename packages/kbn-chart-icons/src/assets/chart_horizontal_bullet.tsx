/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { EuiIconProps } from '@elastic/eui';

export const IconChartHorizontalBullet = ({
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
        d="M0 7.5C0 7.22386 0.223858 7 0.5 7H15.5C15.7761 7 16 7.22386 16 7.5V9.5C16 9.77614 15.7761 10 15.5 10C15.2239 10 15 9.77614 15 9.5V8H1V9.5C1 9.77614 0.776142 10 0.5 10C0.223858 10 0 9.77614 0 9.5V7.5Z"
        fill="#343741"
      />
    </svg>
  );
};
