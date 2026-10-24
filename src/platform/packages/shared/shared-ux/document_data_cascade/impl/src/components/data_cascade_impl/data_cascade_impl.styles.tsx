/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import { type UseEuiTheme, euiCanAnimate } from '@elastic/eui';

export const overflowYAuto = css({ overflowY: 'auto' });

// Data attribute set on the sticky header render slot that reflects whether the sticky header is displayed.
export const stickyHeaderVisibleAttribute = 'data-sticky-header-visible';

export const relativePosition = css({ position: 'relative' });

export const dataCascadeImplStyles = (euiTheme: UseEuiTheme['euiTheme']) => ({
  container: css({
    flex: '1 1 auto',
    // Creates a new stacking context to prevent z-index values
    // from the virtualized rows from bleeding out to other elements
    isolation: 'isolate',
  }),
  containerInner: css([relativePosition, { height: '100%' }]),
  cascadeLoadingContainer: css({
    height: '100%',
    width: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  }),
  cascadeTreeGridBlock: css([
    overflowYAuto,
    relativePosition,
    {
      contain: 'layout style',
      overflowAnchor: 'none',
      scrollbarGutter: 'auto',
      scrollbarWidth: 'thin',
      border: `${euiTheme.border.width.thin} solid ${euiTheme.border.color}`,
      borderRadius: euiTheme.border.radius.inline,
    },
  ]),
  /**
   * Always rendered so the portal target exists ahead of time. The slot itself has no height (its content is
   * absolutely positioned), visibility is conveyed to the content through the `data-sticky-header-visible`
   * attribute so that the content can transition between the shown and hidden states.
   */
  cascadeTreeGridHeaderStickyRenderSlot: css({
    position: 'sticky',
    top: 0,
    left: 0,
    right: 0,
    zIndex: euiTheme.levels.header,
    transform: 'translateY(0)',
    visibility: 'visible',

    [euiCanAnimate]: {
      transition: `visibility ${euiTheme.animation.normal} ${euiTheme.animation.resistance}, transform ${euiTheme.animation.normal} ${euiTheme.animation.resistance}`,
    },

    [`&[${stickyHeaderVisibleAttribute}="false"]`]: {
      pointerEvents: 'none',
      transform: 'translateY(-100%)',
      visibility: 'hidden',
    },
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
