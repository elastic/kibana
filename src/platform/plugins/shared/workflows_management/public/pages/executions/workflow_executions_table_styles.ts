/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';
import { euiFontSize } from '@elastic/eui';
import { css } from '@emotion/react';

/**
 * UnifiedDataTable defaults to monospace (`familyCode`) for `.unifiedDataTable__cellValue`.
 * Apply body typography once at the row level so default and optional columns match.
 */
export const getWorkflowExecutionsTableGridWrapperCss = (themeContext: UseEuiTheme) => {
  const { euiTheme } = themeContext;
  const { fontSize, lineHeight } = euiFontSize(themeContext, 's');

  return css`
    flex: 1 1 auto;
    width: 100%;
    min-width: 0;

    .unifiedDataTable__table,
    .euiDataGrid {
      width: 100%;
    }

    .unifiedDataTable__inner .euiDataGridRowCell .euiDataGridRowCell__content {
      padding-block: ${euiTheme.size.m};
    }

    .unifiedDataTable__inner .euiDataGridHeaderCell {
      padding-block: ${euiTheme.size.m};
    }

    .unifiedDataTable__inner .euiDataGridHeader,
    .unifiedDataTable__inner .euiDataGridHeaderCell {
      background-color: ${euiTheme.components.dataGridRowBackground} !important;
    }

    .unifiedDataTable__inner .euiDataGridHeader {
      border-bottom: ${euiTheme.border.width.thick} solid ${euiTheme.colors.text} !important;
    }

    .unifiedDataTable__inner
      .euiDataGridRowCell:not(.euiDataGridRowCell--controlColumn)
      .euiDataGridRowCell__content--defaultHeight {
      display: flex;
      align-items: center;
    }

    .unifiedDataTable__inner .euiDataGridRowCell:not(.euiDataGridRowCell--controlColumn) {
      font-family: ${euiTheme.font.family};
      font-size: ${fontSize};
      line-height: ${lineHeight};
      color: ${euiTheme.colors.textParagraph};
    }

    .unifiedDataTable__inner
      .euiDataGridRowCell:not(.euiDataGridRowCell--controlColumn)
      .unifiedDataTable__cellValue {
      display: flex;
      align-items: center;
      min-width: 0;
      width: 100%;
      font-family: inherit;
      font-size: inherit;
      line-height: inherit;
      color: inherit;
    }

    .unifiedDataTable__inner
      .euiDataGridRowCell:not(.euiDataGridRowCell--controlColumn)
      .unifiedDataTable__cellValue
      * {
      font-family: inherit;
    }

    .unifiedDataTable__inner
      .euiDataGrid--fontSizeSmall
      .euiDataGridRowCell__content--defaultHeight
      .unifiedDataTable__rowControl {
      align-self: center;
      margin-top: 0;
    }
  `;
};
