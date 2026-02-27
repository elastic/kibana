/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css, keyframes } from '@emotion/react';
import { type UseEuiTheme, euiCanAnimate } from '@elastic/eui';

export const overflowYAuto = css({ overflowY: 'auto' });

export const relativePosition = css({ position: 'relative' });

const slideIn = keyframes({
  '0%': {
    transform: 'translateY(-100%)',
  },
  '100%': {
    transform: 'translateY(0)',
  },
});

export const dataCascadeImplStyles = (euiTheme: UseEuiTheme['euiTheme']) => ({
  container: css({
    flex: '1 1 auto',
    // Creates a new stacking context to prevent z-index values
    // from the virtualized rows from bleeding out to other elements
    isolation: 'isolate',
  }),
  containerInner: css([relativePosition, { height: '100%' }]),
  cascadeTreeGridBlock: css([
    overflowYAuto,
    relativePosition,
    {
      scrollbarGutter: 'auto',
      scrollbarWidth: 'thin',
      border: `${euiTheme.border.width.thin} solid ${euiTheme.border.color}`,
      borderRadius: euiTheme.border.radius.small,
    },
  ]),
  cascadeTreeGridHeaderStickyRenderSlot: css({
    position: 'sticky',
    top: 0,
    left: 0,
    right: 0,
    zIndex: euiTheme.levels.header,
    [euiCanAnimate]: {
      animation: `${slideIn} ${euiTheme.animation.slow} ${euiTheme.animation.resistance}`,
    },
  }),
  // Hidden variant - keeps the element in DOM so ref is always available,
  // but visually hidden and non-interactive
  cascadeTreeGridHeaderStickyRenderSlotHidden: css({
    position: 'sticky',
    top: 0,
    left: 0,
    right: 0,
    visibility: 'hidden',
    pointerEvents: 'none',
    height: 0,
    overflow: 'hidden',
  }),
  cascadeTreeGridWrapper: css({
    background: euiTheme.colors.backgroundBaseSubdued,

    '&:before': {
      content: '""',
      position: 'absolute',
      height: '100%',
      width: '100%',
      borderRight: `${euiTheme.border.width.thin} solid ${euiTheme.border.color}`,
    },
  }),
});
