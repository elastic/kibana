/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type FunctionComponent } from 'react';
import { css } from '@emotion/react';
import { EuiPanel, useEuiMemoizedStyles } from '@elastic/eui';
import type { UseEuiTheme } from '@elastic/eui';
import { InfoBlock } from './info_block.component';

const FLYOUT_MIN_CELL_WIDTH = 140;
const FLYOUT_MAX_GRID_COLUMNS = 4;
import type { InfoBlocksMaxColumns, InfoBlocksProps } from './types';

const CONTAINER_NAME = 'infoBlocks';

/**
 * Grid and divider rules for a `columns`-wide state. The `:nth-child(n)` resets tie on specificity
 * with the rules that follow, so those win on source order.
 */
const columnState = (columns: number) => `
  grid-template-columns: repeat(${columns}, minmax(0, 1fr));

  & > :nth-child(n)::before {
    display: block;
  }
  & > :nth-child(${columns}n)::before {
    display: none;
  }

  & > :nth-child(n)::after {
    display: none;
  }
  & > :nth-child(${columns}n + 1)::after {
    display: block;
  }
  & > :nth-child(1)::after {
    display: none;
  }
`;

/** Widest state first; container queries tie on specificity, so the narrowest must come last. */
const responsiveGrid = (maxColumns: number) => {
  let steps = '';
  for (let columns = maxColumns - 1; columns >= 1; columns--) {
    // Each state needs `columns * FLYOUT_MIN_CELL_WIDTH` to fit.
    steps += `
      @container ${CONTAINER_NAME} (width < ${(columns + 1) * FLYOUT_MIN_CELL_WIDTH}px) {
        ${columnState(columns)}
      }
    `;
  }
  return css`
    ${columnState(maxColumns)}
    ${steps}
  `;
};

/** Caps `'auto'` picks from, widest first; two columns reads too sparse. */
const AUTO_COLUMN_CANDIDATES = [FLYOUT_MAX_GRID_COLUMNS, 3] as const;

/** Empty cells trailing the last row at a given cap. */
const gapsFor = (itemCount: number, columns: number) => (columns - (itemCount % columns)) % columns;

/**
 * Widest cap whose last row has at most one gap, else the fullest last row, preferring the wider cap
 * on a tie. Governs the widest state only; narrower containers still step down from it.
 */
export const resolveMaxColumns = (itemCount: number): InfoBlocksMaxColumns => {
  // Sets small enough for one row get a column each, never narrower than two.
  if (itemCount <= 2) return 2;
  if (itemCount === 3) return 3;

  const clean = AUTO_COLUMN_CANDIDATES.find((columns) => gapsFor(itemCount, columns) <= 1);
  if (clean !== undefined) return clean;

  return gapsFor(itemCount, 4) <= gapsFor(itemCount, 3) ? 4 : 3;
};

const styles = ({ euiTheme }: UseEuiTheme) => {
  const color = euiTheme.border.color;
  const thickness = euiTheme.border.width.thin;
  // Keeps dividers clear of the panel's rounded corners.
  const cornerGap = euiTheme.size.base;
  // Container-wide so a partial row's separator stays continuous; 2px allows for the panel borders.
  const rowLineWidth = `calc(100cqw - ${cornerGap} * 2 - 2px)`;

  return {
    wrapper: css`
      container-type: inline-size;
      container-name: ${CONTAINER_NAME};
    `,

    panel: css`
      display: grid;

      & > * {
        position: relative;
        min-width: 0;
      }

      /* ::before is the column divider on each cell's inline-end edge. */
      & > *::before {
        content: '';
        position: absolute;
        inset-inline-end: 0;
        inset-block: ${cornerGap};
        inline-size: ${thickness};
        background-color: ${color};
        display: block;
      }

      /* ::after is the row separator, drawn on the block-start edge by each row's first cell. */
      & > *::after {
        content: '';
        position: absolute;
        inset-block-start: 0;
        inset-inline-start: ${cornerGap};
        inline-size: ${rowLineWidth};
        block-size: ${thickness};
        background-color: ${color};
        display: none;
      }
    `,

    /** One variant per supported cap, since each has its own breakpoint ladder. */
    grids: {
      2: responsiveGrid(2),
      3: responsiveGrid(3),
      4: responsiveGrid(FLYOUT_MAX_GRID_COLUMNS),
    },

    cell: css`
      padding: ${euiTheme.size.m};
    `,
  };
};

/** Responsive card for a small set of labeled values. */
export const InfoBlocks: FunctionComponent<InfoBlocksProps> = ({
  items,
  maxColumns = 'auto',
  ...rest
}) => {
  const memoized = useEuiMemoizedStyles(styles);
  const columns = maxColumns === 'auto' ? resolveMaxColumns(items.length) : maxColumns;

  return (
    <div css={memoized.wrapper}>
      <EuiPanel
        paddingSize="none"
        hasShadow={false}
        hasBorder
        css={[memoized.panel, memoized.grids[columns]]}
        data-test-subj={rest['data-test-subj'] ?? 'infoBlocks'}
      >
        {items.map((item, index) => (
          <div key={item['data-test-subj'] ?? index} css={memoized.cell}>
            <InfoBlock {...item} />
          </div>
        ))}
      </EuiPanel>
    </div>
  );
};
