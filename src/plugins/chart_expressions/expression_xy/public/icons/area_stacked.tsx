/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiIconProps } from '@elastic/eui';

export const AreaStackedIcon = ({ title, titleId, ...props }: Omit<EuiIconProps, 'type'>) => (
  <svg
    viewBox="0 0 30 22"
    width={31}
    height={22}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-labelledby={titleId}
    {...props}
  >
    {title ? <title id={titleId}>{title}</title> : null}
    <path
      d="M0 15.213l.484.091.813.146.762.129C3.779 15.859 5.09 16 6 16c.986 0 1.712-.25 3.166-.966l.281-.14C10.802 14.217 11.381 14 12 14c.507 0 .988.146 1.89.571l1.209.592c1.28.617 1.977.837 2.901.837 1.028 0 1.75-.349 3.119-1.344l.89-.659C23.034 13.252 23.535 13 24 13c.581 0 1.232.185 2.598.718l1.1.436.568.217c.72.27 1.256.438 1.736.532L30 21a1 1 0 01-1 1H1a1 1 0 01-1-1v-5.787z"
      className="lensChartIcon__accent"
    />
    <path
      d="M24 1c1.334 0 3.334 1 6 3v8.842l-.324-.098c-.346-.11-.759-.262-1.273-.462l-1.101-.436-.568-.217-.536-.193C25.277 11.118 24.676 11 24 11c-1.028 0-1.75.349-3.119 1.344l-.89.659c-1.024.745-1.524.997-1.99.997-.508 0-.989-.146-1.89-.571l-1.21-.592c-1.28-.617-1.977-.837-2.9-.837-.987 0-1.713.25-3.167.966l-.281.14C7.198 13.783 6.619 14 6 14l-.334-.007c-1.182-.045-3.08-.317-5.665-.815V9c2 0 4.666 1 6 1 2 0 4-4 6-4s4 1 6 1 4-6 6-6z"
      className="lensChartIcon__subdued"
    />
  </svg>
);
