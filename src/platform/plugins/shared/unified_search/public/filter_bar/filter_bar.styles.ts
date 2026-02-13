/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

export const filterBarStyles = ({ euiTheme }: UseEuiTheme, afterQueryBar?: boolean) => {
  return {
    group: css`
      gap: ${euiTheme.size.xs};

      &:not(:empty) {
        margin-top: ${afterQueryBar ? euiTheme.size.s : 0};
      }
    `,
    /** Pills group without margin - for use when nested in collapsible wrapper */
    groupWithoutMargin: css`
      gap: ${euiTheme.size.xs};
    `,
    /** Scrollable container for filter pills when expanded */
    pillsScrollContainer: css`
      max-height: 150px;
      overflow-y: auto;
    `,
  };
};
