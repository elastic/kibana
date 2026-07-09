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
/** Below this width a block collapses to fewer columns */
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
        // Vertical dividers between columns; horizontal dividers between rows.
        const isFirstColumn = index % columns === 0;
        const isFirstRow = index < columns;
        return (
          <div
            key={item['data-test-subj'] ?? index}
            css={css`
              min-width: 0;
              padding: ${cellPadding};
              ${!isFirstColumn ? `border-inline-start: ${euiTheme.border.thin};` : ''}
              ${!isFirstRow ? `border-block-start: ${euiTheme.border.thin};` : ''}
            `}
          >
            <InfoBlock {...item} compressed={compressed} />
          </div>
        );
      })}
    </EuiPanel>
  );
};
