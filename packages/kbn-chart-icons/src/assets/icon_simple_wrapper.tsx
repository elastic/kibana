/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { EuiIconProps } from '@elastic/eui';

export const IconSimpleWrapper = ({
  title,
  titleId,
  children,
  height = '16',
  width = '16',
  ...props
}: Omit<EuiIconProps, 'type'>) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-labelledby={titleId}
      {...props}
    >
      {title ? <title id={titleId}>{title}</title> : null}
      {children}
    </svg>
  );
};

export const ChartIconWrapper = (props: Omit<EuiIconProps, 'type'>) =>
  IconSimpleWrapper({ ...props, width: '30', height: '22' });
