/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { EuiInMemoryTable, EuiInMemoryTableProps, euiScreenReaderOnly } from '@elastic/eui';
import { ShardFailureDescription } from './shard_failure_description';
import { ShardFailure } from './shard_failure_types';

export interface ListItem extends ShardFailure {
  id: string;
}

const SORTING: EuiInMemoryTableProps<ListItem>['sorting'] = {
  sort: {
    field: 'index',
    direction: 'desc',
  },
};

export function ShardFailureTable({ failures }: { failures: ShardFailure[] }) {
  const itemList = failures.map((failure, idx) => ({ ...{ id: String(idx) }, ...failure }));

  const columns = [
    {
      name: i18n.translate('data.search.searchSource.fetch.shardsFailedModal.tableColReason', {
        defaultMessage: 'Reason',
      }),
      render: (item: ListItem) => {
        return <ShardFailureDescription {...item} />;
      },
      mobileOptions: {
        header: false,
      },
    },
  ];

  return (
    <EuiInMemoryTable
      itemId="id"
      items={itemList}
      columns={columns}
      pagination={itemList.length > 10}
      sorting={SORTING}
      css={css`
        & .euiTableHeaderCell {
          ${euiScreenReaderOnly()}
        }
        & .euiTableRowCell {
          border-top: none;
        }
      `}
    />
  );
}
