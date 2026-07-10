/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, type FunctionComponent } from 'react';
import { css } from '@emotion/react';
import { EuiPanel, useEuiTheme, useResizeObserver } from '@elastic/eui';
import { InfoBlock } from './info_block.component';
import { isLeadingSpacer } from './types';
import type { InfoBlocksItem, InfoBlocksProps } from './types';

/** Maximum number of columns */
const MAX_COLUMNS = 3;
/** Minimum cell width before the grid drops a column. */
const MIN_BLOCK_WIDTH = 140;

/** Pick 1-3 columns from measured width and visible item count. */
export const getInfoBlocksColumnCount = (width: number, itemCount: number): number => {
  const fitColumns = width > 0 ? Math.floor(width / MIN_BLOCK_WIDTH) : MAX_COLUMNS;
  return Math.max(1, Math.min(MAX_COLUMNS, fitColumns, itemCount || 1));
};

/** Computed grid placement + divider hints for a single cell. */
export interface InfoBlockCellLayout {
  /** Zero-based column the cell starts in. */
  columnStart: number;
  /** Number of columns the cell spans (1 for a real block). */
  span: number;
  /** Whether the cell reaches the trailing grid edge. */
  isLastColumn: boolean;
  /** True when a real block exists in a later row (drives the horizontal divider). */
  hasRowBelow: boolean;
  /** True for a leading spacer: renders no content and no vertical divider. */
  isSpacer: boolean;
}

/** Places items in grid order and derives divider flags. */
export const getInfoBlocksLayout = (
  items: readonly InfoBlocksItem[],
  columns: number
): InfoBlockCellLayout[] => {
  const cols = Math.max(1, columns);
  const placed: Array<{ columnStart: number; span: number; row: number; isSpacer: boolean }> = [];
  let col = 0;
  let row = 0;
  for (const item of items) {
    const isSpacer = isLeadingSpacer(item);
    const columnStart = col;
    const span = isSpacer ? Math.max(1, cols - col) : 1;
    placed.push({ columnStart, span, row, isSpacer });
    col += span;
    if (col >= cols) {
      col = 0;
      row += 1;
    }
  }
  // Trailing spacer-only rows do not count as content.
  const lastContentRow = placed.reduce(
    (last, cell) => (cell.isSpacer ? last : Math.max(last, cell.row)),
    -1
  );
  return placed.map((cell) => ({
    columnStart: cell.columnStart,
    span: cell.span,
    isSpacer: cell.isSpacer,
    isLastColumn: cell.columnStart + cell.span >= cols,
    hasRowBelow: cell.row < lastContentRow,
  }));
};

/** Responsive card for a small set of labeled values. */
export const InfoBlocks: FunctionComponent<InfoBlocksProps> = ({ items, compressed, ...rest }) => {
  const { euiTheme } = useEuiTheme();
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const { width } = useResizeObserver(container);

  // Compressed mode drops row-shaping spacers.
  const visibleItems = compressed ? items.filter((item) => !isLeadingSpacer(item)) : items;
  const columns = getInfoBlocksColumnCount(width, visibleItems.length);
  const layout = getInfoBlocksLayout(visibleItems, columns);
  const cellPadding = compressed ? euiTheme.size.s : euiTheme.size.m;
  const dividerColor = euiTheme.border.color;
  const dividerThickness = euiTheme.border.width.thin;
  // Keep divider ends off the card corners.
  const dividerCornerGap = euiTheme.size.base;

  return (
    <EuiPanel
      panelRef={setContainer}
      paddingSize="none"
      hasShadow={false}
      hasBorder
      data-test-subj={rest['data-test-subj'] ?? 'infoBlocks'}
      css={css`
        display: grid;
        grid-template-columns: repeat(${columns}, minmax(0, 1fr));
      `}
    >
      {visibleItems.map((item, index) => {
        const cell = layout[index];

        if (isLeadingSpacer(item)) {
          return (
            <div
              key={`spacer-${index}`}
              aria-hidden="true"
              css={css`
                position: relative;
                grid-column: span ${cell.span};
                ${cell.hasRowBelow
                  ? `
                      &::after {
                        content: '';
                        position: absolute;
                        inset-block-end: 0;
                        inset-inline-start: ${cell.columnStart === 0 ? dividerCornerGap : '0'};
                        inset-inline-end: ${cell.isLastColumn ? dividerCornerGap : '0'};
                        block-size: ${dividerThickness};
                        background-color: ${dividerColor};
                      }
                    `
                  : ''}
              `}
            />
          );
        }

        // Cell dividers are pseudo-elements so content layout stays simple.
        const isFirstColumn = cell.columnStart === 0;
        return (
          <div
            key={item['data-test-subj'] ?? index}
            css={css`
              position: relative;
              min-width: 0;
              padding: ${cellPadding};
              grid-column: span ${cell.span};
              ${!cell.isLastColumn
                ? `
                    &::before {
                      content: '';
                      position: absolute;
                      inset-inline-end: 0;
                      inset-block: ${dividerCornerGap};
                      inline-size: ${dividerThickness};
                      background-color: ${dividerColor};
                    }
                  `
                : ''}
              ${cell.hasRowBelow
                ? `
                    &::after {
                      content: '';
                      position: absolute;
                      inset-block-end: 0;
                      inset-inline-start: ${isFirstColumn ? dividerCornerGap : '0'};
                      inset-inline-end: ${cell.isLastColumn ? dividerCornerGap : '0'};
                      block-size: ${dividerThickness};
                      background-color: ${dividerColor};
                    }
                  `
                : ''}
            `}
          >
            <InfoBlock {...item} compressed={compressed} />
          </div>
        );
      })}
    </EuiPanel>
  );
};
