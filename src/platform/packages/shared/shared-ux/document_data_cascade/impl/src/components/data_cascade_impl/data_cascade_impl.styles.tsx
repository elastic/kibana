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

export const dataCascadeImplStyles = (euiTheme: UseEuiTheme['euiTheme']) => ({
  container: {},
  cascadeHeaderWrapper: css({
    padding: euiTheme.size.s,
  }),
  cascadeTreeGridHeader: css({
    position: 'sticky',
    willChange: 'transform',
    zIndex: euiTheme.levels.header,
    background: euiTheme.colors.backgroundBaseSubdued,
  }),
  cascadeTreeGridHeaderStickyRenderSlot: css({
    position: 'relative',
  }),
  cascadeTreeGridWrapper: css({
    background: euiTheme.colors.backgroundBaseSubdued,
  }),
});
