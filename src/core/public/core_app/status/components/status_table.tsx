/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
