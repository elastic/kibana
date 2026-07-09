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
import type { InfoBlocksProps } from './types';

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
        // Dividers are drawn as pseudo-elements.
        //  - ::before = vertical divider on the inline-END of every non-last
        //    column, inset from top/bottom by dividerCornerGap so it stops
        //    short of the corners. Drawing on the end (not the start) means a
        //    partial last row still gets a divider to the right of its last
        //    filled block — the empty trailing cells have no cell to draw one.
        //  - ::after = horizontal divider between rows, drawn on the block-END
        //    of every cell that has a row below it. Drawing it on the (always
        //    full) upper row lets it span the whole width even when the last
        //    row is partial, and it stays SOLID through the interior column
        //    intersections — only the outer ends are inset by the gap.
        const column = index % columns;
        const isFirstColumn = column === 0;
        const isLastColumn = column === columns - 1;
        const hasRowBelow =
          Math.floor(index / columns) < Math.floor((items.length - 1) / columns);
        return (
          <div
            key={item['data-test-subj'] ?? index}
            css={css`
              position: relative;
              min-width: 0;
              padding: ${cellPadding};
              ${!isLastColumn
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
              ${hasRowBelow
                ? `
                    &::after {
                      content: '';
                      position: absolute;
                      inset-block-end: 0;
                      inset-inline-start: ${isFirstColumn ? dividerCornerGap : '0'};
                      inset-inline-end: ${isLastColumn ? dividerCornerGap : '0'};
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
