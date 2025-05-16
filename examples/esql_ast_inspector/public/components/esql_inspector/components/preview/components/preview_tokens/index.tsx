/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as React from 'react';
import { EuiDataGrid, EuiPanel, EuiSpacer } from '@elastic/eui';
import { createParser } from '@kbn/esql-ast';
import { useEsqlInspector } from '../../../../context';
import { useBehaviorSubject } from '../../../../../../hooks/use_behavior_subject';

const columns = [
  {
    id: 'token',
    display: 'Token',
  },
  {
    id: 'symbol',
    display: 'Symbol',
  },
  {
    id: 'type',
    display: 'Type',
  },
  {
    id: 'channel',
    display: 'Channel',
  },
];

const symbolicNames = createParser('').lexer.symbolicNames;

export const PreviewTokens: React.FC = (props) => {
  const state = useEsqlInspector();
  const query = useBehaviorSubject(state.queryLastValid$);

  const [visibleColumns, setVisibleColumns] = React.useState(columns.map(({ id }) => id));

  if (!query) {
    return null;
  }

  interface Row {
    token: string;
    symbol: string;
    type: number;
    channel: number;
  }

  const data: Row[] = [];

  for (const token of query.tokens) {
    data.push({
      token: token.text,
      symbol: symbolicNames[token.type] ?? '',
      type: token.type,
      channel: token.channel,
    });
  }

  return (
    <>
      <EuiSpacer size="l" />
      <EuiPanel paddingSize="xs" hasShadow={false} hasBorder style={{ height: 600 }}>
        <EuiDataGrid
          aria-label="Container constrained data grid demo"
          columns={columns}
          columnVisibility={{
            visibleColumns,
            setVisibleColumns,
          }}
          rowCount={data.length}
          gridStyle={{
            border: 'horizontal',
            header: 'underline',
          }}
          renderCellValue={({ rowIndex, columnId }) => (data as any)[rowIndex][columnId]}
        />
      </EuiPanel>
    </>
  );
};
