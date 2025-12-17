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
import type { CascadeSizing } from '../../types';

export const flexHelper = css({ minWidth: 0, maxWidth: '100%' });

export const styles = (euiTheme: UseEuiTheme['euiTheme'], size: CascadeSizing) => ({
  rowHeaderTitleWrapper: css({
    minWidth: 0,
    overflow: 'hidden',
    justifyContent: 'center',

    '& > *': {
      fontVariantNumeric: 'tabular-nums',
    },
  }),
  rowHeaderSlotContainer: css({
    minWidth: 0,
    maxWidth: 'fit-content',
    overflowX: 'auto',
    justifyContent: 'center',
  }),
  rowHeaderSlotContainerInner: css({ flexGrow: 0 }),
  rowHeaderSlotItemWrapper: css({
    justifyContent: 'center',
    alignItems: 'center',
    borderLeft: `${euiTheme.border.width.thin} solid ${euiTheme.border.color}`,
    paddingLeft: euiTheme.size.s,
    flexGrow: 0,

    '& > *': {
      // Ensure that all direct children of the slot wrapper
      // that render numbers have the same font size and weight for consistency
      fontVariantNumeric: 'tabular-nums',
    },
  }),
});
