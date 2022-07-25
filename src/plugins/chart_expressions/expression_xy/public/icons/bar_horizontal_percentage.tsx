/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiIconProps } from '@elastic/eui';

export const BarHorizontalPercentageIcon = ({
  title,
  titleId,
  ...props
}: Omit<EuiIconProps, 'type'>) => (
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
      d="M20 16v6H1a1 1 0 01-1-1v-4a1 1 0 011-1h19zm-3-8v6H1.222C.547 14 0 13.552 0 13V9c0-.552.547-1 1.222-1H17zm1-8v6H1.042C.466 6 0 5.552 0 5V1c0-.552.466-1 1.042-1H18z"
      className="lensChartIcon__subdued"
    />
    <path
      d="M29 16a1 1 0 011 1v4a1 1 0 01-1 1h-7v-6h7zm-.222-8C29.453 8 30 8.448 30 9v4c0 .552-.547 1-1.222 1H19V8h9.778zm.18-8C29.534 0 30 .448 30 1v4c0 .552-.466 1-1.042 1H20V0h8.958z"
      className="lensChartIcon__accent"
    />
  </svg>
);
