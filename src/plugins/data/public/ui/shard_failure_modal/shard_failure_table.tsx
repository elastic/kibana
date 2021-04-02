/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, ReactElement } from 'react';
// @ts-ignore
import { EuiInMemoryTable, EuiButtonIcon } from '@elastic/eui';
// @ts-ignore
import { RIGHT_ALIGNMENT } from '@elastic/eui/lib/services';
import { i18n } from '@kbn/i18n';
import { ShardFailureDescription } from './shard_failure_description';
import { ShardFailure } from './shard_failure_types';
import { getFailureSummaryText } from './shard_failure_description_header';

export interface ListItem extends ShardFailure {
  id: string;
}

export function ShardFailureTable({ failures }: { failures: ShardFailure[] }) {
  const itemList = failures.map((failure, idx) => ({ ...{ id: String(idx) }, ...failure }));
  const initalMap = {} as Record<string, ReactElement>;

  const [expandMap, setExpandMap] = useState(initalMap);

  const columns = [
    {
      align: RIGHT_ALIGNMENT,
      width: '40px',
      isExpander: true,
      render: (item: ListItem) => {
        const failureSummeryText = getFailureSummaryText(item);
        const collapseLabel = i18n.translate(
          'data.search.searchSource.fetch.shardsFailedModal.tableRowCollapse',
          {
            defaultMessage: 'Collapse {rowDescription}',
            description: 'Collapse a row of a table with failures',
            values: { rowDescription: failureSummeryText },
          }
        );

        const expandLabel = i18n.translate(
          'data.search.searchSource.fetch.shardsFailedModal.tableRowExpand',
          {
            defaultMessage: 'Expand {rowDescription}',
            description: 'Expand a row of a table with failures',
            values: { rowDescription: failureSummeryText },
          }
        );

        return (
          <EuiButtonIcon
            onClick={() => {
              // toggle displaying the expanded view of the given list item
              const map = Object.assign({}, expandMap);
              if (map[item.id]) {
                delete map[item.id];
              } else {
                map[item.id] = <ShardFailureDescription {...item} />;
              }
              setExpandMap(map);
            }}
            aria-label={expandMap[item.id] ? collapseLabel : expandLabel}
            iconType={expandMap[item.id] ? 'arrowUp' : 'arrowDown'}
          />
        );
      },
    },
    {
      field: 'shard',
      name: i18n.translate('data.search.searchSource.fetch.shardsFailedModal.tableColShard', {
        defaultMessage: 'Shard',
      }),
      sortable: true,
      truncateText: true,
      width: '80px',
    },
    {
      field: 'index',
      name: i18n.translate('data.search.searchSource.fetch.shardsFailedModal.tableColIndex', {
        defaultMessage: 'Index',
      }),
      sortable: true,
      truncateText: true,
    },
    {
      field: 'node',
      name: i18n.translate('data.search.searchSource.fetch.shardsFailedModal.tableColNode', {
        defaultMessage: 'Node',
      }),
      sortable: true,
      truncateText: true,
    },
    {
      field: 'reason.type',
      name: i18n.translate('data.search.searchSource.fetch.shardsFailedModal.tableColReason', {
        defaultMessage: 'Reason',
      }),
      truncateText: true,
    },
  ];

  return (
    <EuiInMemoryTable
      itemId="id"
      items={itemList}
      columns={columns}
      pagination={true}
      sorting={{
        sort: {
          field: 'index',
          direction: 'desc',
        },
      }}
      itemIdToExpandedRowMap={expandMap}
    />
  );
}
