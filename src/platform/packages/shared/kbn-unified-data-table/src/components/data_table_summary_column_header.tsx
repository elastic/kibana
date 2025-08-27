/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { EuiIconTip, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ROWS_HEIGHT_OPTIONS } from '../constants';
import ColumnHeaderTruncateContainer from './column_header_truncate_container';

const DEFAULT_COLUMN_HEADER_TOOLTIP_CONTENT = i18n.translate(
  'unifiedDataTable.tableHeader.sourceFieldIconTooltip',
  {
    defaultMessage: 'Shows a quick view of the record using its key:value pairs.',
  }
);

const DEFAULT_COLUMN_HEADER_TOOLTIP_TITLE = i18n.translate(
  'unifiedDataTable.tableHeader.sourceFieldIconTooltipTitle',
  {
    defaultMessage: 'Summary',
  }
);

const SUMMARY_COLUMN_NAME = i18n.translate('unifiedDataTable.tableHeader.summary', {
  defaultMessage: 'Summary',
});

export const UnifiedDataTableSummaryColumnHeader = ({
  headerRowHeight = ROWS_HEIGHT_OPTIONS.single,
  columnDisplayName = SUMMARY_COLUMN_NAME,
  tooltipContent = DEFAULT_COLUMN_HEADER_TOOLTIP_CONTENT,
  tooltipTitle = DEFAULT_COLUMN_HEADER_TOOLTIP_TITLE,
  iconTipDataTestSubj = 'unifiedDataTable_headerSummaryIcon',
}: {
  headerRowHeight?: number;
  columnDisplayName?: string;
  tooltipContent?: React.ReactNode | string;
  tooltipTitle?: string;
  iconTipDataTestSubj?: string;
}) => {
  const { euiTheme } = useEuiTheme();

  const marginStyle = useMemo(() => ({ marginLeft: euiTheme.size.xs }), [euiTheme.size.xs]);

  return (
    <ColumnHeaderTruncateContainer headerRowHeight={headerRowHeight}>
      {columnDisplayName}
      <span css={marginStyle}>
        <EuiIconTip
          data-test-subj={iconTipDataTestSubj}
          type="question"
          content={tooltipContent}
          title={tooltipTitle}
        />
      </span>
    </ColumnHeaderTruncateContainer>
  );
};
