/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, ReactNode } from 'react';
import { estypes } from '@elastic/elasticsearch';
import { i18n } from '@kbn/i18n';
import { EuiBasicTable, EuiButtonIcon, EuiText } from '@elastic/eui';
import { ShardFailureDetails } from './shard_failure_details';

interface Props {
  failures: estypes.ShardFailure[];
}

export function ShardFailureTable({ failures }: Props) {
  const [expandedRows, setExpandedRows] = useState<Record<number, ReactNode>>({});

  const toggleDetails = (shard: number) => {
    const nextExpandedRows = { ...expandedRows };
    if (shard in nextExpandedRows) {
      delete nextExpandedRows[shard];
    } else {
      const shardFailure = failures.find(failure => shard === failure.shard);
      nextExpandedRows[shard] = shardFailure ? <ShardFailureDetails failure={shardFailure} /> : null;
    }
    setExpandedRows(nextExpandedRows);
  };

  const columns = [
    {
      field: 'shard',
      name: i18n.translate('inspector.requests.clusters.shards.table.shardLabel', {
        defaultMessage: 'Shard',
      }),
      render: (shard: string) => {
        return (
          <>
            <EuiButtonIcon
              onClick={() => toggleDetails(shard)}
              aria-label={
                shard in expandedRows
                  ? i18n.translate('inspector.requests.clusters.shards.table.collapseRow', {
                      defaultMessage: 'Collapse table row to hide shard details',
                    })
                  : i18n.translate('inspector.requests.clusters.shards.table.expandRow', {
                      defaultMessage: 'Expand table row to view shard details',
                    })
              }
              iconType={shard in expandedRows ? 'arrowDown' : 'arrowRight'}
            />
            <EuiText size="xs" color="subdued">
              {shard}
            </EuiText>
          </>
        );
      },
      width: '20%',
    },
    {
      field: 'index',
      name: i18n.translate('inspector.requests.clusters.shards.table.indexLabel', {
        defaultMessage: 'Index',
      }),
      render: (index?: string) =>
        index ? (
          <EuiText size="xs" color="subdued">
            {index}
          </EuiText>
        ) : null,
    },
    {
      field: 'failureType',
      name: i18n.translate('inspector.requests.clusters.shards.table.failureTypeLabel', {
        defaultMessage: 'Failure type',
      }),
      render: (failureType: string) => (
        <EuiText size="xs" color="subdued">
          {failureType}
        </EuiText>
      ),
    },
  ];

  return (
    <EuiBasicTable
      items={failures.map(({ shard, index, reason }) => {
        return {
          shard,
          index,
          failureType: reason.type,
        };
      })}
      isExpandable={true}
      itemIdToExpandedRowMap={expandedRows}
      itemId="shard"
      columns={columns}
    />
  );
}
