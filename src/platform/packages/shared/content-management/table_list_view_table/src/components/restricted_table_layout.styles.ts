/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import type { EuiThemeComputed } from '@elastic/eui';

export const TABLE_LIST_VIEW_TITLE_COLUMN_TEST_SUBJ = 'tableListViewTitleColumn';

/**
 * Keeps the title column at a fixed footprint and pushes leftover horizontal
 * space to a trailing pseudo-cell so Creator / Last updated / Actions sit
 * immediately after the title column instead of at the far right edge.
 */
export const getRestrictedTableLayoutStyles = (
  euiTheme: EuiThemeComputed,
  titleColumnMaxWidth: string
) => css`
  thead tr::after,
  tbody tr::after {
    content: '';
    display: table-cell;
    border-block: ${euiTheme.border.thin};
  }

  th[data-test-subj='${TABLE_LIST_VIEW_TITLE_COLUMN_TEST_SUBJ}'],
  th[data-test-subj^='tableHeaderCell_attributes.title'],
  td[data-test-subj='${TABLE_LIST_VIEW_TITLE_COLUMN_TEST_SUBJ}'] {
    width: ${titleColumnMaxWidth} !important;
    max-width: ${titleColumnMaxWidth} !important;
  }
`;
