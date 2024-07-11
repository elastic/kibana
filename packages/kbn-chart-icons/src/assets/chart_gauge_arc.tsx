/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { EuiIconProps } from '@elastic/eui';

export const IconChartGaugeArc = ({ title, titleId, ...props }: Omit<EuiIconProps, 'type'>) => {
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
        d="M12.0962 3.90381C9.55779 1.3654 5.44221 1.3654 2.90381 3.90381C0.484359 6.32325 0.370973 10.1755 2.56365 12.7292L3.61091 11.682C3.80617 11.4867 4.12276 11.4867 4.31802 11.682C4.51328 11.8772 4.51328 12.1938 4.31802 12.3891L2.90381 13.8033C2.70854 13.9986 2.39196 13.9986 2.1967 13.8033C-0.732233 10.8744 -0.732233 6.12563 2.1967 3.1967C5.12563 0.267767 9.87437 0.267767 12.8033 3.1967C15.7322 6.12563 15.7322 10.8744 12.8033 13.8033C12.608 13.9986 12.2915 13.9986 12.0962 13.8033L10.682 12.3891C10.4867 12.1938 10.4867 11.8772 10.682 11.682C10.8772 11.4867 11.1938 11.4867 11.3891 11.682L12.4364 12.7292C14.629 10.1755 14.5156 6.32325 12.0962 3.90381Z"
        fill="#343741"
      />
    </svg>
  );
};
