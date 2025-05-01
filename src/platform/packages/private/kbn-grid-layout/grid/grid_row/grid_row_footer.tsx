/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { css } from '@emotion/react';

import { UseEuiTheme } from '@elastic/eui';

export interface GridRowProps {
  sectionId: string;
}

export const GridRowFooter = React.memo(({ sectionId }: GridRowProps) => {
  return (
    <span
      data-row-id={sectionId}
      className={'kbnGridRowFooter'}
      css={({ euiTheme }: UseEuiTheme) => {
        return css`
          grid-column-start: 1;
          grid-column-end: -1;
          grid-row-end: end-${sectionId};
          grid-row-start: span 1;
          height: ${euiTheme.size.s};
          display: block;
          border-top: ${euiTheme.border.thin};
        `;
      }}
    />
  );
});

GridRowFooter.displayName = 'KbnGridLayoutRowFooter';
