/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import type { UseEuiTheme } from '@elastic/eui';

export const cascadeToolbarPortalNodeTestSubjAttribute = 'discoverCascadeToolbarPortalNode';

export const getCustomCascadeGridBodyStyle = (euiTheme: UseEuiTheme['euiTheme']) => ({
  wrapper: css({
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    position: 'relative',
    height: '100%',
    contain: 'content',
    backgroundColor: euiTheme.colors.backgroundBaseSubdued,
  }),
  headerViewport: css({
    flexShrink: 0,
    overflow: 'hidden',
    backgroundColor: euiTheme.colors.backgroundBaseSubdued,
  }),
  virtualizerContainer: css({
    width: '100%',
    height: '100%',
    overflow: 'auto',
    position: 'relative',
    scrollbarWidth: 'thin',
  }),
  virtualizerInner: css({
    position: 'absolute',
    left: 0,
    width: '100%',
    overflowAnchor: 'none',
  }),
  row: css({
    display: 'flex',
    backgroundColor: euiTheme.colors.backgroundBaseSubdued,
  }),
});
