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
import {
  FLYOUT_MIN_CELL_WIDTH,
  FLYOUT_MAX_GRID_COLUMNS,
  type InfoBlocksProps,
} from '@kbn/shared-ux-flyout-common';
import { InfoBlock } from './info_block.component';

const CONTAINER_NAME = 'infoBlocks';

const styles = ({ euiTheme }: UseEuiTheme) => {
  // Shared with MetadataPairs: both grids drop a column at the same container width.
  const twoColumnBelow = FLYOUT_MAX_GRID_COLUMNS * FLYOUT_MIN_CELL_WIDTH; // 420
  const oneColumnBelow = 2 * FLYOUT_MIN_CELL_WIDTH; // 280
  const color = euiTheme.border.color;
  const thickness = euiTheme.border.width.thin;
  // Horizontal divider insets keep the line off the rounded card corners.
  const cornerGap = euiTheme.size.base;

  return {
    // Bare wrapper so container-type measures the same box as MetadataPairs (no border offset).
    wrapper: css`
      container-type: inline-size;
      container-name: ${CONTAINER_NAME};
    `,

    panel: css`
      display: grid;

      /* Every cell needs position: relative so its absolute pseudo-elements stay inside it. */
      & > * {
        position: relative;
        min-width: 0;
      }

      /*
       * Pseudo-element shells — defined once, present on every cell.
       * ::before  = vertical divider on the inline-end edge
       * ::after   = horizontal divider on the block-end edge
       * display and inset-inline-* are overridden per column state below.
       */
      & > *::before {
        content: '';
        position: absolute;
        inset-inline-end: 0;
        inset-block: ${cornerGap};
        inline-size: ${thickness};
        background-color: ${color};
        display: block;
      }
      & > *::after {
        content: '';
        position: absolute;
        inset-block-end: 0;
        inset-inline-start: 0;
        inset-inline-end: 0;
        block-size: ${thickness};
        background-color: ${color};
        display: block;
      }

      /* ── 3-column state (default) ── */
      grid-template-columns: repeat(3, minmax(0, 1fr));

      /* Vertical divider: hide on trailing column. */
      & > :nth-child(3n)::before {
        display: none;
      }

      /* Horizontal divider: hide for the ~last row (:nth-last-child is exact when the last
         row is full; it hides one extra item per missing cell when the last row is partial). */
      & > :nth-last-child(-n + 3)::after {
        display: none;
      }

      /* Corner insets — first and last columns only; middle columns keep the 0/0 default. */
      & > :nth-child(3n + 1)::after {
        inset-inline-start: ${cornerGap};
      }
      & > :nth-child(3n)::after {
        inset-inline-end: ${cornerGap};
      }

      /* ── 2-column state ── */
      @container ${CONTAINER_NAME} (width < ${twoColumnBelow}px) {
        grid-template-columns: repeat(2, minmax(0, 1fr));

        /* :nth-child(n) matches every item at the same specificity as :nth-child(3n), so
           the container-query rule wins by source order, resetting the 3-col hide. */
        & > :nth-child(n)::before {
          display: block;
        }
        & > :nth-child(2n)::before {
          display: none;
        }

        & > :nth-child(n)::after {
          display: block;
        }
        & > :nth-last-child(-n + 2)::after {
          display: none;
        }

        & > :nth-child(2n + 1)::after {
          inset-inline-start: ${cornerGap};
          inset-inline-end: 0;
        }
        & > :nth-child(2n)::after {
          inset-inline-start: 0;
          inset-inline-end: ${cornerGap};
        }
      }

      /* ── 1-column state ── */
      @container ${CONTAINER_NAME} (width < ${oneColumnBelow}px) {
        grid-template-columns: minmax(0, 1fr);

        & > :nth-child(n)::before {
          display: none;
        }

        /* Full-width divider with corner insets on both sides. */
        & > :nth-child(n)::after {
          display: block;
          inset-inline-start: ${cornerGap};
          inset-inline-end: ${cornerGap};
        }
        & > :nth-last-child(1)::after {
          display: none;
        }
      }
    `,

    /*
     * Applied only when hasLeadingSpacer is active: forces the 2nd item to the first
     * column of the next row so the first item occupies a single cell with its dividers
     * intact. Written as a separate style so it can be conditionally composed via css array.
     */
    leadingSpacer: css`
      & > :nth-child(2) {
        grid-column-start: 1;
        grid-row-start: 2;
      }

      @container ${CONTAINER_NAME} (width < ${twoColumnBelow}px) {
        & > :nth-child(2) {
          grid-column-start: 1;
          grid-row-start: 2;
        }
      }

      /* Single column: items flow naturally; no forced placement needed. */
      @container ${CONTAINER_NAME} (width < ${oneColumnBelow}px) {
        & > :nth-child(2) {
          grid-column-start: 1;
          grid-row-start: auto;
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
  hasLeadingSpacer,
  compressed,
  ...rest
}) => {
  const memoized = useEuiMemoizedStyles(styles);
  // Compressed mode opts out of the row-shaping leading spacer.
  const effectiveHasLeadingSpacer = Boolean(hasLeadingSpacer) && !compressed;

  return (
    <div css={memoized.wrapper}>
      <EuiPanel
        paddingSize="none"
        hasShadow={false}
        hasBorder
        css={[memoized.panel, effectiveHasLeadingSpacer && memoized.leadingSpacer]}
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
