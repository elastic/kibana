/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiIconProps } from '@elastic/eui';

export const BarReferenceLineIcon = ({ title, titleId, ...props }: Omit<EuiIconProps, 'type'>) => (
  <svg
    viewBox="0 0 16 12"
    width={30}
    height={22}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-labelledby={titleId}
    {...props}
  >
    {title ? <title id={titleId}>{title}</title> : null}
    <g>
      <path
        className="lensChartIcon__subdued"
        d="M3.2 4.79997C3.2 4.50542 2.96122 4.26663 2.66667 4.26663H0.533333C0.238784 4.26663 0 4.50542 0 4.79997V6.39997H3.2V4.79997ZM3.2 9.59997H0V13.3333C0 13.6279 0.238784 13.8666 0.533333 13.8666H2.66667C2.96122 13.8666 3.2 13.6279 3.2 13.3333V9.59997ZM8.53333 9.59997H11.7333V13.3333C11.7333 13.6279 11.4946 13.8666 11.2 13.8666H9.06667C8.77211 13.8666 8.53333 13.6279 8.53333 13.3333V9.59997ZM11.7333 6.39997H8.53333V2.66663C8.53333 2.37208 8.77211 2.1333 9.06667 2.1333H11.2C11.4946 2.1333 11.7333 2.37208 11.7333 2.66663V6.39997ZM12.8 9.59997V13.3333C12.8 13.6279 13.0388 13.8666 13.3333 13.8666H15.4667C15.7612 13.8666 16 13.6279 16 13.3333V9.59997H12.8ZM16 6.39997V5.86663C16 5.57208 15.7612 5.3333 15.4667 5.3333H13.3333C13.0388 5.3333 12.8 5.57208 12.8 5.86663V6.39997H16ZM7.46667 11.2C7.46667 10.9054 7.22789 10.6666 6.93333 10.6666H4.8C4.50544 10.6666 4.26667 10.9054 4.26667 11.2V13.3333C4.26667 13.6279 4.50544 13.8666 4.8 13.8666H6.93333C7.22789 13.8666 7.46667 13.6279 7.46667 13.3333V11.2Z"
      />
      <rect
        y="7.4668"
        width="16"
        height="1.06667"
        rx="0.533334"
        className="lensChartIcon__accent"
      />
    </g>
  </svg>
);
