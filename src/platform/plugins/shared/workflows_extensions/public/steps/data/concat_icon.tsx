/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

interface SVGRProps {
  title?: string;
  titleId?: string;
}

// Forward SVG props so EuiIcon can apply `color` via currentColor.
export const ConcatIcon = ({
  title,
  titleId,
  ...props
}: React.SVGProps<SVGSVGElement> & SVGRProps) => (
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
      d="M5 3H3V13H5V14H3C2.44772 14 2 13.5523 2 13V3C2 2.44772 2.44772 2 3 2H5V3Z"
      fill="currentColor"
    />
    <path
      d="M14 2C14.5523 2 15 2.44772 15 3V13C15 13.5523 14.5523 14 14 14H12V13H14V3H12V2H14Z"
      fill="currentColor"
    />
    <circle cx="6.5" cy="8.5" r="1" stroke="currentColor" />
    <circle cx="10.5" cy="8.5" r="1" stroke="currentColor" />
  </svg>
);
