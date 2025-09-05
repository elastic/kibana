/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import { type UseEuiTheme } from '@elastic/eui';

export const overflowYAuto = css({ overflowY: 'auto' });

export const relativePosition = css({ position: 'relative' });

export const dataCascadeImplStyles = (euiTheme: UseEuiTheme['euiTheme']) => ({
  container: css({ flex: '1 1 auto' }),
  cascadeHeaderWrapper: css({
    padding: euiTheme.size.s,
  }),
  cascadeTreeGridHeader: css({
    position: 'sticky',
    willChange: 'transform',
    zIndex: euiTheme.levels.header,
    background: euiTheme.colors.backgroundBasePlain,

    // preserves the round edges on the top bar on scroll
    '&[data-scrolled="true"]::before': {
      content: '""',
      position: 'absolute',
      height: '100%',
      width: '100%',
      borderRadius: euiTheme.border.radius.small,
      boxShadow: `inset ${euiTheme.border.color} 0px ${euiTheme.border.width.thin} 0px`,
      top: `calc(100% - ${euiTheme.border.radius.small} + ${euiTheme.border.width.thin})`,
      pointerEvents: 'none',
    },
  }),
  cascadeTreeGridHeaderScrolled: css({
    borderBottom: `${euiTheme.border.width.thin} solid ${euiTheme.border.color}`,
  }),
  cascadeTreeGridHeaderStickyRenderSlot: css(relativePosition, {}),
  cascadeTreeGridWrapper: css({
    background: euiTheme.colors.backgroundBaseSubdued,
  }),
});
