/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { memo } from 'react';

import { IInterpreterRenderHandlers } from '@kbn/expressions-plugin';
import { TableGroup, TableVisConfig, TableVisUseUiStateProps } from '../types';
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
        {tables.map(({ table, title }) => (
          <div key={title} className="tbvChart__split">
            <TableVisBasic
              fireEvent={fireEvent}
              table={table}
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
