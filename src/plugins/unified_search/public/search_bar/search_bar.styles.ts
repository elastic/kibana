/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

export const searchBarStyles = ({ euiTheme }: UseEuiTheme, isESQLQuery: boolean) => {
  return {
    uniSearchBar: css`
      padding: ${isESQLQuery ? 0 : euiTheme.size.s};
      position: relative;
    `,
    detached: css`
      border-bottom: ${euiTheme.border.thin};
    `,
    inPage: css`
      padding: 0;
    `,
    withBorders: css`
      border: ${euiTheme.border.thin};
      border-bottom: none;
    `,
    hidden: css`
      display: none;
    `,
  };
};
