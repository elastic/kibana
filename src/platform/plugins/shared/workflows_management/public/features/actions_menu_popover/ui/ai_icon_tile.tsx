/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { AiIcon } from '@kbn/shared-ux-ai-components';

/** Matches @kbn/shared-ux-ai-components AiButton icon-only diagonal gradient. */
const AI_TILE_GRADIENT_ANGLE = 135;
const AI_TILE_GRADIENT_START_PERCENT = 2.98;
const AI_TILE_GRADIENT_END_PERCENT = 66.24;

/**
 * Soft Primary → Assistance fill + border, using Base tokens (same weight as other
 * category tiles). Light/Filled variants are stronger AiButton chrome.
 */
export const aiIconTileCss = ({ euiTheme }: UseEuiTheme) => {
  const fill = `linear-gradient(${AI_TILE_GRADIENT_ANGLE}deg, ${euiTheme.colors.backgroundBasePrimary} ${AI_TILE_GRADIENT_START_PERCENT}%, ${euiTheme.colors.backgroundBaseAssistance} ${AI_TILE_GRADIENT_END_PERCENT}%)`;
  const border = `linear-gradient(${AI_TILE_GRADIENT_ANGLE}deg, ${euiTheme.colors.borderBasePrimary} ${AI_TILE_GRADIENT_START_PERCENT}%, ${euiTheme.colors.borderBaseAssistance} ${AI_TILE_GRADIENT_END_PERCENT}%)`;

  return css({
    position: 'relative',
    isolation: 'isolate',
    border: 'none',
    background: fill,
    '&::after': {
      content: '""',
      position: 'absolute',
      inset: 0,
      borderRadius: 'inherit',
      padding: '1px',
      background: border,
      pointerEvents: 'none',
      WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
      WebkitMaskComposite: 'xor',
      mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
      maskComposite: 'exclude',
    },
  });
};

/** Sparkles glyph with the standard Kibana AI Primary → Assistance SVG gradient. */
export function ActionsMenuAiIcon(): JSX.Element {
  return <AiIcon iconType="sparkles" size="m" aria-hidden />;
}
