/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { SVGProps } from 'react';

interface EmptyDotIconProps extends SVGProps<SVGSVGElement> {
  /** Accessible title, rendered as an SVG `<title>`. */
  title?: string;
  /** Id of the `<title>` element, referenced by `aria-labelledby`. */
  titleId?: string;
}

/** Outline version of EUI's `dot` icon, with the same size. */
export const EmptyDotIcon = ({ title, titleId, ...props }: EmptyDotIconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={16}
    height={16}
    viewBox="0 0 16 16"
    aria-labelledby={titleId}
    {...props}
  >
    {title ? <title id={titleId}>{title}</title> : null}
    <path
      fillRule="evenodd"
      d="M12 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm-1 0a3 3 0 1 0-6 0 3 3 0 0 0 6 0Z"
    />
  </svg>
);
