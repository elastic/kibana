/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { FunctionComponent } from 'react';
import { EuiBasicTable, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { FormattedStatus } from '../lib';

interface StatusTableProps {
  statuses?: FormattedStatus[];
}

const tableColumns = [
  {
    field: 'state',
    name: '',
    render: (state: FormattedStatus['state']) => (
      <EuiIcon type="dot" aria-hidden color={state.uiColor} />
    ),
    width: '32px',
  },
  {
    field: 'id',
    name: i18n.translate('core.statusPage.statusTable.columns.idHeader', {
      defaultMessage: 'ID',
    }),
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
    <EuiBasicTable<FormattedStatus>
      columns={tableColumns}
      items={statuses}
      rowProps={({ state }) => ({
        className: `status-table-row-${state.uiColor}`,
      })}
      data-test-subj="statusBreakdown"
    />
  );
};
