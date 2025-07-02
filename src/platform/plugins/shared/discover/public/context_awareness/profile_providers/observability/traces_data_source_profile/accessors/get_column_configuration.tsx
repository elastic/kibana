/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ColumnHeaderTruncateContainer } from '@kbn/unified-data-table';
import type { CustomGridColumnProps } from '@kbn/unified-data-table';
import { i18n } from '@kbn/i18n';
import { EuiIconTip } from '@elastic/eui';
import React from 'react';
import type { DataSourceProfileProvider } from '../../../..';

export const getColumnConfiguration: DataSourceProfileProvider['profile']['getColumnConfiguration'] =
  (prev) => () => ({
    ...(prev ? prev() : {}),
    _source: ({ column, headerRowHeight }: CustomGridColumnProps) => ({
      ...column,
      display: (
        <DataTableSummaryColumnHeaderTracesContext
          columnDisplayName={column.displayAsText ?? 'Summary'}
          headerRowHeight={headerRowHeight}
        />
      ),
    }),
  });

export const DataTableSummaryColumnHeaderTracesContext = ({
  headerRowHeight = 1,
  columnDisplayName,
}: {
  headerRowHeight?: number;
  columnDisplayName: string;
}) => {
  const tooltipTitle = i18n.translate(
    'discover.unifiedDataTable.tableHeader.tracesContext.sourceFieldIconTooltipTitle',
    {
      defaultMessage: 'Summary including the following fields',
    }
  );
  const tooltipContent = i18n.translate(
    'discover.unifiedDataTable.tableHeader.tracesContext.sourceFieldIconTooltip',
    {
      defaultMessage:
        'Displays the most relevant resource identifiers (service.name, event.outcome, transaction.name, etc.)',
    }
  );

  return (
    <ColumnHeaderTruncateContainer headerRowHeight={headerRowHeight}>
      {columnDisplayName}{' '}
      <EuiIconTip
        data-test-subj="logs-summary-icon"
        type="questionInCircle"
        content={tooltipContent}
        title={tooltipTitle}
      />
    </ColumnHeaderTruncateContainer>
  );
};
