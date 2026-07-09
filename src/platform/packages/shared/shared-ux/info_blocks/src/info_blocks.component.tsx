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
import { isEmptyInfoBlock } from './types';
import type { InfoBlocksItem, InfoBlocksProps } from './types';

/** Maximum number of columns */
const MAX_COLUMNS = 3;
/**
 * Per-block minimum width (px) below which the grid drops a column. This is a
 * fixed design requirement, not an EUI screen breakpoint, so it stays a literal
 * constant rather than a theme value.
 */
const MIN_BLOCK_WIDTH = 140;

/**
 * Computes the responsive column count from the available width: up to
 * {@link MAX_COLUMNS} columns, collapsing 3 -> 2 -> 1 so no block is narrower
 * than {@link MIN_BLOCK_WIDTH}px, and never more columns than there are items.
 * When the width is unknown (0, e.g. before the first measurement) it assumes
 * the maximum.
 */
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
  /**
   * True when the cell reaches the last grid column (the container's right
   * edge); such a cell draws no inline-end (vertical) divider. A real block
   * followed by an empty spacer is NOT last-column, so it keeps its divider.
   */
  isLastColumn: boolean;
  /** True when a real block exists in a later row (drives the horizontal divider). */
  hasRowBelow: boolean;
  /** True for an empty spacer: renders no content and no dividers. */
  isEmpty: boolean;
}

/**
 * Single layout pass over the items for a given column count. A real block
 * spans one column; an empty spacer spans the rest of its row and pushes the
 * next block onto a fresh row. Divider hints are derived here so placement and
 * dividers stay in sync (see the pseudo-element notes in {@link InfoBlocks}).
 */
export const getInfoBlocksLayout = (
  items: readonly InfoBlocksItem[],
  columns: number
): InfoBlockCellLayout[] => {
  const cols = Math.max(1, columns);
  const placed: Array<{ columnStart: number; span: number; row: number; isEmpty: boolean }> = [];
  let col = 0;
  let row = 0;
  for (const item of items) {
    const isEmpty = isEmptyInfoBlock(item);
    const columnStart = col;
    const span = isEmpty ? Math.max(1, cols - col) : 1;
    placed.push({ columnStart, span, row, isEmpty });
    col += span;
    if (col >= cols) {
      col = 0;
      row += 1;
    }
  }
  // Highest row index that holds a real block; a trailing empty row never draws
  // a horizontal divider above it.
  const lastContentRow = placed.reduce(
    (last, cell) => (cell.isEmpty ? last : Math.max(last, cell.row)),
    -1
  );
  return placed.map((cell) => ({
    columnStart: cell.columnStart,
    span: cell.span,
    isEmpty: cell.isEmpty,
    isLastColumn: cell.columnStart + cell.span >= cols,
    hasRowBelow: cell.row < lastContentRow,
  }));
};

/**
 * Responsive "info blocks" card. Blocks lay out in up to {@link MAX_COLUMNS}
 * columns and collapse 3 -> 2 -> 1 as the container narrows, so no block ever
 * shrinks below {@link MIN_BLOCK_WIDTH}px. Does not stick on scroll.
 */
export const InfoBlocks: FunctionComponent<InfoBlocksProps> = ({ items, compressed, ...rest }) => {
  const { euiTheme } = useEuiTheme();
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const { width } = useResizeObserver(container);

  const columns = getInfoBlocksColumnCount(width, items.length);
  const layout = getInfoBlocksLayout(items, columns);
  const cellPadding = compressed ? euiTheme.size.s : euiTheme.size.m;
  const dividerColor = euiTheme.border.color;
  const dividerThickness = euiTheme.border.width.thin;
  // Dividers stop this far short of the grid corners so the lines never meet
  // at the intersections.
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
      {items.map((item, index) => {
        // Placement + divider hints come from the single layout pass so they
        // stay correct across empty spacers and the live column count.
        const cell = layout[index];

        // An empty spacer renders no content and no vertical divider, but it
        // still carries the horizontal divider so that line stays continuous
        // across the whole container.
        if (isEmptyInfoBlock(item)) {
          return (
            <div
              key={`empty-${index}`}
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

        // Dividers are drawn as pseudo-elements.
        //  - ::before = vertical divider on the inline-END of a cell that is
        //    not the last column, inset from top/bottom by dividerCornerGap so
        //    it stops short of the corners. A real block followed by an empty
        //    spacer keeps this divider (it is not the last column), and a
        //    partial trailing row keeps the divider beside its last filled block.
        //  - ::after = horizontal divider between rows, drawn on the block-END
        //    of every cell (including empty spacers) that has a row below it, so
        //    the line spans the whole container width and stays SOLID through
        //    the interior column intersections — only the outer ends inset by
        //    the gap.
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
