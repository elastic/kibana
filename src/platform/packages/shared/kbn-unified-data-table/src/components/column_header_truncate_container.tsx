/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiTextBlockTruncate, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

const ColumnHeaderTruncateContainer = ({
  headerRowHeight,
  children,
  wordBreak = 'break-all',
}: {
  headerRowHeight?: number;
  children: React.ReactNode;
  wordBreak?: string;
}) => {
  const { euiTheme } = useEuiTheme();

  const headerCss = css`
    overflow-wrap: anywhere;
    white-space: normal;
    word-break: ${wordBreak};
    line-height: ${euiTheme.size.base};
    text-align: left;
    .euiDataGridHeaderCell--numeric & {
      float: right;
    }
  `;

  return headerRowHeight ? (
    <EuiTextBlockTruncate lines={headerRowHeight} css={headerCss}>
      {children}
    </EuiTextBlockTruncate>
  ) : (
    <div css={headerCss}>{children}</div>
  );
};

// eslint-disable-next-line import/no-default-export
export default ColumnHeaderTruncateContainer;
