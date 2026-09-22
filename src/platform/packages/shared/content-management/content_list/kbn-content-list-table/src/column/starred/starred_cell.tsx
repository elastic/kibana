/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { memo } from 'react';
import { css } from '@emotion/react';
import { StarButton } from './star_button';

/** Props for the {@link StarredCell} component. */
export interface StarredCellProps {
  /** Item ID to render the star button for. */
  id: string;
}

/**
 * Always-visible star button cell: overrides the table-level hover-hide rule applied
 * by {@link cssFavoriteHoverWithinEuiTableRow} so the button is shown at rest, not
 * only on row hover. The inline variant in `NameCell` intentionally keeps hover-only.
 *
 * The table rule hides empty buttons via `.euiTableRow .cm-favorite-button--empty`
 * inside `@media (hover: hover)`. Adding `.euiTableRow` to our own selector produces
 * specificity `(0, 3, 0)` vs the table rule's `(0, 2, 0)`, so the override wins
 * without resorting to `!important`.
 */
const alwaysVisibleCss = css`
  @media (hover: hover) {
    .euiTableRow & .cm-favorite-button--empty {
      visibility: visible;
      opacity: 1;
    }
  }
`;

const cellCss = css`
  display: flex;
  align-items: center;
  justify-content: center;
`;

/**
 * Cell renderer for `Column.Starred`. Centers the star button in the
 * narrow fixed-width column. The star button is always visible (not hover-only).
 */
export const StarredCell = memo(({ id }: StarredCellProps) => {
  return (
    <span css={[cellCss, alwaysVisibleCss]}>
      <StarButton id={id} />
    </span>
  );
});

StarredCell.displayName = 'StarredCell';
