/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiTextBlockTruncate } from '@elastic/eui';
import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';

const ColumnHeaderTruncateContainer = ({
  headerRowHeight,
  children,
}: {
  headerRowHeight?: number;
  children: React.ReactNode;
}) => {
  const headerCss = css`
    overflow-wrap: anywhere;
    white-space: normal;
    word-break: break-all;
    line-height: ${euiThemeVars.euiSize};
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
