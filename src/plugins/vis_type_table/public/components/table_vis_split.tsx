/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { memo } from 'react';

import { IInterpreterRenderHandlers } from 'src/plugins/expressions';
import { TableGroup } from '../table_vis_response_handler';
import { TableVisConfig, TableVisUseUiStateProps } from '../types';
import { TableVisBasic } from './table_vis_basic';

interface TableVisSplitProps {
  fireEvent: IInterpreterRenderHandlers['event'];
  tables: TableGroup[];
  visConfig: TableVisConfig;
  uiStateProps: TableVisUseUiStateProps;
}

export const TableVisSplit = memo(
  ({ fireEvent, tables, visConfig, uiStateProps }: TableVisSplitProps) => {
    return (
      <>
        {tables.map(({ tables: dataTable, key, title }) => (
          <div key={key} className="tbvChart__split">
            <TableVisBasic
              fireEvent={fireEvent}
              table={dataTable[0]}
              visConfig={visConfig}
              title={title}
              uiStateProps={uiStateProps}
            />
          </div>
        ))}
      </>
    );
  }
);
