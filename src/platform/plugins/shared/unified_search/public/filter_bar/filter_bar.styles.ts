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
    filterBarWrapperCollaped: css`
      margin-bottom: -${euiTheme.size.s};
      padding: ${euiTheme.size.xs} 0;
    `,
    filterBarWrapperExpanded: css`
      & .euiButtonIcon {
        margin-top: ${euiTheme.size.m};
      }
    `,
    filterPillGroup: css`
      gap: ${euiTheme.size.xs};
      max-height: calc(${euiTheme.size.base} * 10);
      overflow-y: auto;

      &:not(:empty) {
        margin-top: ${afterQueryBar ? euiTheme.size.s : 0};
      }
    `,
    /** Scrollable container for filter pills when expanded */
    pillsScrollContainer: css`
      max-height: 150px;
      overflow-y: auto;
    `,
    /** These two classes reduce horizontal whitespace between the collapse/expand button and the filter bar
     * content while preserving the minimum a11y-mandated click target size of 24x24px
     */
    filterBarCollapseExpandButton: css`
      position: relative;
      left: -${euiTheme.size.xs};
    `,
    filterBarContent: css`
      position: relative;
      min-width: 0;
      left: -${euiTheme.size.s};
    `,
  };
};
