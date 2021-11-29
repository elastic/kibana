/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FunctionComponent, ReactElement, useState } from 'react';
import {
  EuiInMemoryTable,
  EuiIcon,
  EuiButtonIcon,
  EuiBasicTableColumn,
  EuiScreenReaderOnly,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { FormattedStatus, getLevelSortValue } from '../lib';
import { StatusExpandedRow } from './status_expanded_row';

interface StatusTableProps {
  statuses?: FormattedStatus[];
}

const expandLabel = i18n.translate('core.statusPage.statusTable.columns.expandRow.expandLabel', {
  defaultMessage: 'Expand',
});

const collapseLabel = i18n.translate(
  'core.statusPage.statusTable.columns.expandRow.collapseLabel',
  { defaultMessage: 'Collapse' }
);

export const StatusTable: FunctionComponent<StatusTableProps> = ({ statuses }) => {
  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<
    Record<string, ReactElement>
  >({});
  if (!statuses) {
    return null;
  }

  const toggleDetails = (item: FormattedStatus) => {
    const newRowMap = { ...itemIdToExpandedRowMap };
    if (itemIdToExpandedRowMap[item.id]) {
      delete newRowMap[item.id];
    } else {
      newRowMap[item.id] = <StatusExpandedRow status={item} />;
    }
    setItemIdToExpandedRowMap(newRowMap);
  };

  const tableColumns: Array<EuiBasicTableColumn<FormattedStatus>> = [
    {
      field: 'state',
      name: i18n.translate('core.statusPage.statusTable.columns.statusHeader', {
        defaultMessage: 'Status',
      }),
      render: (state: FormattedStatus['state']) => (
        <EuiIcon type="dot" aria-hidden color={state.uiColor} title={state.title} />
      ),
      width: '100px',
      align: 'center' as const,
      sortable: (row: FormattedStatus) => getLevelSortValue(row),
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
      name: i18n.translate('core.statusPage.statusTable.columns.statusSummaryHeader', {
        defaultMessage: 'Status summary',
      }),
      render: (state: FormattedStatus['state']) => <span>{state.message}</span>,
    },
    {
      name: (
        <EuiScreenReaderOnly>
          <FormattedMessage
            id="core.statusPage.statusTable.columns.expandRowHeader"
            defaultMessage="Expand row"
          />
        </EuiScreenReaderOnly>
      ),
      align: 'right',
      width: '40px',
      isExpander: true,
      render: (item: FormattedStatus) => (
        <EuiButtonIcon
          onClick={() => toggleDetails(item)}
          aria-label={itemIdToExpandedRowMap[item.id] ? collapseLabel : expandLabel}
          iconType={itemIdToExpandedRowMap[item.id] ? 'arrowUp' : 'arrowDown'}
        />
      ),
    },
  ];

  return (
    <EuiInMemoryTable<FormattedStatus>
      columns={tableColumns}
      itemId={(item) => item.id}
      items={statuses}
      isExpandable={true}
      itemIdToExpandedRowMap={itemIdToExpandedRowMap}
      rowProps={({ state }) => ({
        className: `status-table-row-${state.uiColor}`,
      })}
      sorting={{
        sort: {
          direction: 'asc',
          field: 'state',
        },
      }}
      data-test-subj="statusBreakdown"
    />
  );
};
