/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiColorPaletteDisplay } from '@elastic/eui';
import { css } from '@emotion/react';
import type { AccessorConfig } from './types';
import { MAX_PALETTE_INDICATOR_COLORS } from './constants';

export function PaletteIndicator({ accessorConfig }: { accessorConfig: AccessorConfig }) {
  if (accessorConfig.triggerIconType !== 'colorBy' || !accessorConfig.palette) return null;
  return (
    <div
      css={css`
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
      `}
    >
      <EuiColorPaletteDisplay
        css={css`
          &::after {
            border: none;
          }
        `}
        size="xs"
        // limiting the visible colors to a max to avoid too many colors
        palette={accessorConfig.palette.slice(0, MAX_PALETTE_INDICATOR_COLORS)}
      />
    </div>
  );
}
