/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiThemeComputed } from '@elastic/eui';
import { css } from '@emotion/react';

export const partitionVisWrapperStyle = css({
  display: 'flex',
  flex: '1 1 auto',
  minHeight: 0,
  minWidth: 0,
});

export const partitionVisContainerStyleFactory = (theme: EuiThemeComputed) => css`
  ${partitionVisWrapperStyle};

  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  padding: ${theme.size.s};
  margin-left: auto;
  margin-right: auto;
`;
