/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import { type EuiThemeShape } from '@elastic/eui';

export const cascadeRowCellStyles = (euiTheme: EuiThemeShape) => ({
  cellWrapper: css({ width: '100%' }),
  cellInner: css({
    border: `${euiTheme.border.width.thin} solid ${euiTheme.border.color}`,
    borderRadius: euiTheme.border.radius.small,
    '& > *': {
      clipPath: `inset(0 round ${euiTheme.border.radius.small})`,
    },
  }),
});
