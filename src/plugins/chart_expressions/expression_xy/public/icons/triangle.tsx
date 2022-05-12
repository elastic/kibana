/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiIconProps } from '@elastic/eui';
import classnames from 'classnames';

export const TriangleIcon = ({ title, titleId, ...props }: Omit<EuiIconProps, 'type'>) => (
  <svg
    width="16"
    height="16"
    fill="none"
    viewBox="0 0 16 16"
    xmlns="http://www.w3.org/2000/svg"
    aria-labelledby={titleId}
    {...props}
  >
    {title ? <title id={titleId}>{title}</title> : null}
    <path
      strokeWidth="1"
      stroke="currentColor"
      d="M 6.9 11.612 C 7.64533 12.7953 8.39067 12.7953 9.136 11.612 L 13.11 5.3 C 13.8553 4.11667 13.4827 3.525 11.992 3.525 L 4.044 3.525 C 2.55333 3.525 2.18067 4.11667 2.926 5.3 Z"
      className={classnames('lensAnnotationIconNoFill', props.className)}
    />
  </svg>
);
