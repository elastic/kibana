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

interface PinFilledGlyphIconProps extends SVGProps<SVGSVGElement> {
  title?: string;
  titleId?: string;
}

export const PinFilledGlyphIcon = ({
  title,
  titleId,
  ...props
}: PinFilledGlyphIconProps): JSX.Element => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={16}
    height={16}
    viewBox="0 0 16 16"
    fill="none"
    aria-labelledby={titleId}
    {...props}
  >
    {title ? <title id={titleId}>{title}</title> : null}
    <path
      d="M12.1006 7.80761C11.897 8.17592 11.6665 8.58891 11.414 9.0205C10.6312 10.3588 9.63006 11.9329 8.69529 12.9873L9.35447 13.6465L8.64744 14.3535L7.65135 13.3574C7.65001 13.3561 7.64786 13.3548 7.64647 13.3535L5.49999 11.207L1.70801 15H1V14.293L4.79198 10.499L2.64648 8.35351C2.64511 8.35214 2.64388 8.35007 2.64257 8.34863L1.64746 7.35351L2.35449 6.64648L3.06835 7.36035L8.29393 4.00098L12.1006 7.80761ZM9.61814 1.07618C9.99166 0.921778 10.4222 1.00715 10.708 1.29298L14.708 5.29297C14.9935 5.57896 15.0794 6.00942 14.9248 6.38281C14.7701 6.75613 14.405 6.99963 14.0009 7H12.707L9.00096 3.29395V2.00001C9.00096 1.59559 9.24454 1.23099 9.61814 1.07618Z"
      fill="currentColor"
    />
  </svg>
);
