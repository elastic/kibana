/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FunctionComponent } from 'react';
import type { EuiIconProps } from '@elastic/eui';
import { colors } from './common_styles';

export const IconChartTagcloud: FunctionComponent = ({
  title,
  titleId,
  ...props
}: Omit<EuiIconProps, 'type'>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="30" height="22" viewBox="0 0 30 22" {...props}>
    {title ? <title id={titleId} /> : null}
    <path
      d="M19 5a2 2 0 0 1 2-2h4a2 2 0 1 1 0 4h-4a2 2 0 0 1-2-2ZM2 11a2 2 0 0 1 2-2h8a2 2 0 1 1 0 4H4a2 2 0 0 1-2-2Zm15 4a2 2 0 1 0 0 4h6a2 2 0 1 0 0-4h-6Z"
      className={colors.accent}
    />
    <path
      d="M6 4a1 1 0 0 0 0 2h4a1 1 0 1 0 0-2H6Zm8 0a1 1 0 1 0 0 2h2a1 1 0 1 0 0-2h-2Zm2 7a1 1 0 0 1 1-1h10a1 1 0 1 1 0 2H17a1 1 0 0 1-1-1Zm-8 5a1 1 0 1 0 0 2h4a1 1 0 1 0 0-2H8Z"
      className={colors.subdued}
    />
  </svg>
);
