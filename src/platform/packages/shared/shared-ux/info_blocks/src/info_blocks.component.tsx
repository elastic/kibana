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

/** Maximum number of columns (per the PRD: up to 3). */
const MAX_COLUMNS = 3;
/** Below this width a block collapses to fewer columns (PRD: 140px). */
const MIN_BLOCK_WIDTH = 140;

/**
 * Responsive "info blocks" card. Blocks lay out in up to {@link MAX_COLUMNS}
 * columns and collapse 3 -> 2 -> 1 as the container narrows, so no block ever
 * shrinks below {@link MIN_BLOCK_WIDTH}px. Does not stick on scroll.
 */
export const InfoBlocks: FunctionComponent<InfoBlocksProps> = ({ items, compressed, ...rest }) => {
  const { euiTheme } = useEuiTheme();
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const { width } = useResizeObserver(container);

  const fitColumns = width > 0 ? Math.floor(width / MIN_BLOCK_WIDTH) : MAX_COLUMNS;
  const columns = Math.max(1, Math.min(MAX_COLUMNS, fitColumns, items.length || 1));
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
