/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiTextBlockTruncate } from '@elastic/eui';
import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';

const ColumnHeaderTruncateContainer = ({
  headerRowHeight = 1,
  children,
}: {
  headerRowHeight?: number;
  children: React.ReactNode;
}) => {
  return (
    <EuiTextBlockTruncate
      lines={headerRowHeight}
      css={css`
        overflow-wrap: anywhere;
        white-space: normal;
        word-break: break-all;
        line-height: ${euiThemeVars.euiSize};
        text-align: left;
        .euiDataGridHeaderCell--numeric & {
          float: right;
        }
      `}
    >
      {children}
    </EuiTextBlockTruncate>
  );
};

// eslint-disable-next-line import/no-default-export
export default ColumnHeaderTruncateContainer;
