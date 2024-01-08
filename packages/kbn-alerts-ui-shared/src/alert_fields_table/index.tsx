/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import {
  EuiInMemoryTable,
  EuiTabbedContent,
  EuiTabbedContentProps,
  useEuiOverflowScroll,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { memo, useCallback, useMemo, useState } from 'react';
import { Alert } from '@kbn/alerting-types';
import { euiThemeVars } from '@kbn/ui-theme';

export const search = {
  box: {
    incremental: true,
    placeholder: i18n.translate('alertsUIShared.alertFieldsTable.filter.placeholder', {
      defaultMessage: 'Filter by Field, Value, or Description...',
    }),
    schema: true,
  },
};

const columns = [
  {
    field: 'key',
    name: i18n.translate('alertsUIShared.alertFieldsTable.field', {
      defaultMessage: 'Field',
    }),
    width: '30%',
  },
  {
    field: 'value',
    name: i18n.translate('alertsUIShared.alertFieldsTable.value', {
      defaultMessage: 'Value',
    }),
    width: '70%',
  },
];

export const ScrollableFlyoutTabbedContent = (props: EuiTabbedContentProps) => (
  <EuiTabbedContent
    css={css`
      display: flex;
      flex-direction: column;
      flex: 1;

      & [role='tabpanel'] {
        display: flex;
        flex: 1 0 0;
        ${useEuiOverflowScroll('y', true)}
      }
    `}
    {...props}
  />
);

const COUNT_PER_PAGE_OPTIONS = [25, 50, 100];

const useFieldBrowserPagination = () => {
  const [pagination, setPagination] = useState<{ pageIndex: number }>({
    pageIndex: 0,
  });

  const onTableChange = useCallback(({ page: { index } }: { page: { index: number } }) => {
    setPagination({ pageIndex: index });
  }, []);
  const paginationTableProp = useMemo(
    () => ({
      ...pagination,
      pageSizeOptions: COUNT_PER_PAGE_OPTIONS,
    }),
    [pagination]
  );

  return {
    onTableChange,
    paginationTableProp,
  };
};

export interface AlertFieldsTableProps {
  alert: Alert;
}

export const AlertFieldsTable = memo(({ alert }: AlertFieldsTableProps) => {
  const { onTableChange, paginationTableProp } = useFieldBrowserPagination();
  return (
    <EuiInMemoryTable
      items={Object.entries(alert).map(([key, value]) => ({
        key,
        value: Array.isArray(value) ? value?.[0] : value,
      }))}
      itemId="key"
      columns={columns}
      onTableChange={onTableChange}
      pagination={paginationTableProp}
      search={search}
      css={css`
        & .euiTableRow {
          font-size: ${euiThemeVars.euiFontSizeXS};
          font-family: ${euiThemeVars.euiCodeFontFamily};
        }
      `}
    />
  );
});
