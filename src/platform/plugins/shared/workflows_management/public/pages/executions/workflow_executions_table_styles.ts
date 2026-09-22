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

export const getWorkflowExecutionsTableGridWrapperCss = (themeContext: UseEuiTheme) => {
  const { euiTheme } = themeContext;

  return css`
    flex: 1 1 auto;
    width: 100%;
    min-width: 0;

    .euiDataGrid {
      width: 100%;
    }

    .euiDataGrid__leftControls {
      flex-wrap: nowrap;
    }

    .euiDataGridHeader,
    .euiDataGridHeaderCell {
      background-color: ${euiTheme.components.dataGridRowBackground} !important;
    }

    .euiDataGridHeader {
      border-bottom: ${euiTheme.border.width.thick} solid ${euiTheme.colors.text} !important;
    }

    .workflowExecutionsGrid__selectionHeaderCell > [data-focus-lock-disabled] {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
    }

    .euiDataGridRowCell--controlColumn .euiDataGridRowCell__content--defaultHeight {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .euiDataGridRowCell:not(.euiDataGridRowCell--controlColumn)
      .euiDataGridRowCell__content--defaultHeight {
      display: flex;
      align-items: center;
    }

    .workflowExecutionsTableRow--selected .euiDataGridRowCell {
      background-color: ${euiTheme.colors.backgroundBaseInteractiveSelect} !important;
    }
  `;
};
