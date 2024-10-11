/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
import { EuiBasicTableColumn } from '@elastic/eui/src/components/basic_table/basic_table';

export const search = {
  box: {
    incremental: true,
    placeholder: i18n.translate('alertsUIShared.alertFieldsTable.filter.placeholder', {
      defaultMessage: 'Filter by Field, Value, or Description...',
    }),
    schema: true,
  },
};

const columns: Array<EuiBasicTableColumn<AlertField>> = [
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

type AlertField = Exclude<
  {
    [K in keyof Alert]: { key: K; value: Alert[K] };
  }[keyof Alert],
  undefined
>;

export interface AlertFieldsTableProps {
  /**
   * The raw alert object
   */
  alert: Alert;
  /**
   * A list of alert field keys to be shown in the table.
   * When not defined, all the fields are shown.
   */
  fields?: Array<keyof Alert>;
}

/**
 * A paginated, filterable table to show alert object fields
 */
export const AlertFieldsTable = memo(({ alert, fields }: AlertFieldsTableProps) => {
  const { onTableChange, paginationTableProp } = useFieldBrowserPagination();
  const items = useMemo(() => {
    let _items = Object.entries(alert).map(
      ([key, value]) =>
        ({
          key,
          value,
        } as AlertField)
    );
    if (fields?.length) {
      _items = _items.filter((f) => fields.includes(f.key));
    }
    return _items;
  }, [alert, fields]);
  return (
    <EuiInMemoryTable
      items={items}
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
