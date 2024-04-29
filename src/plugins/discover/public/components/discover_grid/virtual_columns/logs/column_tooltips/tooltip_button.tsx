/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiIcon } from '@elastic/eui';
import React from 'react';
import ColumnHeaderTruncateContainer from '@kbn/unified-data-table/src/components/column_header_truncate_container';

export const TooltipButtonComponent = ({
  displayText,
  headerRowHeight,
}: {
  displayText?: string;
  headerRowHeight?: number;
}) => (
  <ColumnHeaderTruncateContainer headerRowHeight={headerRowHeight}>
    {displayText} <EuiIcon type="questionInCircle" />
  </ColumnHeaderTruncateContainer>
);
