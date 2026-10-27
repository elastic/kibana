/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import { euiYScrollWithShadows, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

/** Styles for the scrollable details blocks inside callout accordions; `pre-wrap` keeps multi-line messages readable. */
export const useScrollableListStyles = () => {
  const euiThemeContext = useEuiTheme();
  return useMemo(
    () => css`
      ${euiYScrollWithShadows(euiThemeContext, { height: 'auto' })}
      max-height: 240px;
      padding-top: ${euiThemeContext.euiTheme.size.s};
      padding-bottom: ${euiThemeContext.euiTheme.size.s};
      white-space: pre-wrap;
    `,
    [euiThemeContext]
  );
};
