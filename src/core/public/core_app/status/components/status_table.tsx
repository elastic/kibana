/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FunctionComponent } from 'react';
import { EuiInMemoryTable, EuiIcon, EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { FormattedStatus } from '../lib';

interface StatusTableProps {
  statuses?: FormattedStatus[];
}

const tableColumns: Array<EuiBasicTableColumn<FormattedStatus>> = [
  {
    field: 'state',
    name: i18n.translate('core.statusPage.statusTable.columns.statusHeader', {
      defaultMessage: 'Status',
    }),
    render: (state: FormattedStatus['state']) => (
      <EuiIcon type="dot" aria-hidden color={state.uiColor} title={state.title} />
    ),
    width: '70px',
    align: 'center' as const,
    sortable: (row: FormattedStatus) => row.state.title,
  },
  {
    field: 'id',
    name: i18n.translate('core.statusPage.statusTable.columns.idHeader', {
      defaultMessage: 'ID',
    }),
    sortable: true,
  },
  {
    field: 'state',
    name: i18n.translate('core.statusPage.statusTable.columns.statusHeader', {
      defaultMessage: 'Status',
    }),
    render: (state: FormattedStatus['state']) => <span>{state.message}</span>,
  },
];

export const StatusTable: FunctionComponent<StatusTableProps> = ({ statuses }) => {
  if (!statuses) {
    return null;
  }
  return (
    <EuiInMemoryTable<FormattedStatus>
      columns={tableColumns}
      items={statuses}
      rowProps={({ state }) => ({
        className: `status-table-row-${state.uiColor}`,
      })}
      sorting={{
        sort: {
          direction: 'asc',
          field: 'state.message',
        },
      }}
      data-test-subj="statusBreakdown"
    />
  );
};
