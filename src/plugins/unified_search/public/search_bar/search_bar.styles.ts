/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

export const SearchBarStyles = ({ euiTheme }: UseEuiTheme) => {
  return {
    base: css`
      padding: ${euiTheme.size.s};
    `,
    detached: css`
      border-bottom: ${euiTheme.border.thin};
    `,
    inPage: css`
      padding: 0;
    `,
  };
};
