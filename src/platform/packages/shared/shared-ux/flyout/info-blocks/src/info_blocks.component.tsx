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
import { FLYOUT_MIN_CELL_WIDTH, FLYOUT_MAX_GRID_COLUMNS } from '@kbn/shared-ux-flyout-common';
import { InfoBlock } from './info_block.component';
import type { InfoBlocksProps } from './types';

const CONTAINER_NAME = 'infoBlocks';

const styles = ({ euiTheme }: UseEuiTheme) => {
  const twoColumnBelow = FLYOUT_MAX_GRID_COLUMNS * FLYOUT_MIN_CELL_WIDTH; // 420
  const oneColumnBelow = 2 * FLYOUT_MIN_CELL_WIDTH; // 280
  const color = euiTheme.border.color;
  const thickness = euiTheme.border.width.thin;
  // Keeps dividers clear of the panel's rounded corners.
  const cornerGap = euiTheme.size.base;
  // Container-wide, so a row separator stays continuous across a partial row; 2px covers the borders.
  const rowLineWidth = `calc(100cqw - ${cornerGap} * 2 - 2px)`;

  return {
    wrapper: css`
      container-type: inline-size;
      container-name: ${CONTAINER_NAME};
    `,

    panel: css`
      display: grid;
      grid-template-columns: repeat(${FLYOUT_MAX_GRID_COLUMNS}, minmax(0, 1fr));

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

      /* ── 3-column state (default) ── */
      & > :nth-child(3n)::before {
        display: none;
      }
      & > :nth-child(3n + 1)::after {
        display: block;
      }
      & > :nth-child(1)::after {
        display: none;
      }

      /* ── 2-column state ── */
      @container ${CONTAINER_NAME} (width < ${twoColumnBelow}px) {
        grid-template-columns: repeat(2, minmax(0, 1fr));

        /* :nth-child(n) resets every cell at equal specificity; the exceptions below win on order. */
        & > :nth-child(n)::before {
          display: block;
        }
        & > :nth-child(2n)::before {
          display: none;
        }

        & > :nth-child(n)::after {
          display: none;
        }
        & > :nth-child(2n + 1)::after {
          display: block;
        }
        & > :nth-child(1)::after {
          display: none;
        }
      }

      /* ── 1-column state ── */
      @container ${CONTAINER_NAME} (width < ${oneColumnBelow}px) {
        grid-template-columns: minmax(0, 1fr);

        & > :nth-child(n)::before {
          display: none;
        }
        & > :nth-child(n)::after {
          display: block;
        }
        & > :nth-child(1)::after {
          display: none;
        }

        & > :nth-child(n)::after {
          display: none;
        }
        & > :nth-child(2n + 1)::after {
          display: block;
        }
        & > :nth-child(1)::after {
          display: none;
        }
      }

      /* ── 1-column state ── */
      @container ${CONTAINER_NAME} (width < ${oneColumnBelow}px) {
        grid-template-columns: minmax(0, 1fr);

        & > :nth-child(n)::before {
          display: none;
        }
        & > :nth-child(n)::after {
          display: block;
        }
        & > :nth-child(1)::after {
          display: none;
        }
      }
    `,

    cellDefault: css`
      padding: ${euiTheme.size.m};
    `,

    cellCompressed: css`
      padding: ${euiTheme.size.s};
    `,
  };
};

/** Responsive card for a small set of labeled values. */
export const InfoBlocks: FunctionComponent<InfoBlocksProps> = ({
  items,
  compressed,
  ...rest
}) => {
  const memoized = useEuiMemoizedStyles(styles);

  return (
    <div css={memoized.wrapper}>
      <EuiPanel
        paddingSize="none"
        hasShadow={false}
        hasBorder
        css={memoized.panel}
        data-test-subj={rest['data-test-subj'] ?? 'infoBlocks'}
      >
        {items.map((item, index) => (
          <div
            key={item['data-test-subj'] ?? index}
            css={compressed ? memoized.cellCompressed : memoized.cellDefault}
          >
            <InfoBlock {...item} compressed={compressed} />
          </div>
        ))}
      </EuiPanel>
    </div>
  );
};
