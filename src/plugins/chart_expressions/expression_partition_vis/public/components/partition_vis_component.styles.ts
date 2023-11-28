/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { css } from '@emotion/react';
import { EuiThemeComputed } from '@elastic/eui';

export const partitionVisWrapperStyle = css({
  display: 'flex',
  flex: '1 1 auto',
  minHeight: 0,
  minWidth: 0,
  width: '100%',
  height: '100%',
});

export const partitionVisContainerStyle = css`
  min-height: 0;
  min-width: 0;
  margin-left: auto;
  margin-right: auto;
  width: 100%;
  height: 100%;
  .echTooltip .echTooltip__tableCell--truncate {
    white-space: normal !important;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: hidden;
  }
`;

export const partitionVisContainerWithToggleStyleFactory = (theme: EuiThemeComputed) => css`
  ${partitionVisContainerStyle}

  inset: 0;
  position: absolute;
  padding: ${theme.size.s};
  .echTooltip .echTooltip__tableCell--truncate {
    white-space: normal !important;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: hidden;
  }
`;
