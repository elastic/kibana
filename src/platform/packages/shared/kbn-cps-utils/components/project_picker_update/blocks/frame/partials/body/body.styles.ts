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

export const bodyStyles = ({ euiTheme }: Pick<UseEuiTheme, 'euiTheme'>) => ({
  bodyControlsPadding: css({
    padding: euiTheme.size.base,
  }),
  get filterBoxWrapper() {
    return css([
      this.bodyControlsPadding,
      {
        position: 'sticky',
        top: 0,
        zIndex: euiTheme.levels.header,
        borderBottom: `${euiTheme.border.width.thin} solid ${euiTheme.border.color}`,
        backgroundColor: euiTheme.components.headerBackground,
        padding: euiTheme.size.base,
      },
    ]);
  },
  filterCreateButton: css({
    width: 'fit-content',
  }),
  bodyContainer: css({
    overflowY: 'auto',
    overflowAnchor: 'none',
    scrollbarGutter: 'auto',
    scrollbarWidth: 'thin',
  }),
});
