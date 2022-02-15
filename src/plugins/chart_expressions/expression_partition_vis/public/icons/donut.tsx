/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiIconProps } from '@elastic/eui';

export const DonutIcon = ({ title, titleId, ...props }: Omit<EuiIconProps, 'type'>) => (
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
      d="M19.21 21.119a11 11 0 006.595-8.1c.11-.577-.355-1.082-.942-1.082H20.75c-.477 0-.878.342-1.046.788a5.028 5.028 0 11-6.474-6.474c.447-.168.788-.569.788-1.046V1.094c0-.588-.505-1.053-1.082-.943a11 11 0 106.272 20.968h.002z"
      className="chart-icon__subdued"
    />
    <path
      d="M22.778 3.176A11 11 0 0017.084.154C16.507.042 16 .507 16 1.095v4.116c0 .475.34.875.784 1.044l.14.055A5.026 5.026 0 0119.7 9.17c.168.445.568.784 1.044.784h4.115c.588 0 1.053-.506.942-1.084a11 11 0 00-3.023-5.694z"
      className="chart-icon__accent"
    />
  </svg>
);
