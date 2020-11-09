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

import React, { memo } from 'react';

import { IInterpreterRenderHandlers } from 'src/plugins/expressions';
import { TableGroup } from '../table_vis_response_handler';
import { TableVisConfig, TableVisUiState } from '../types';
import { TableVisBasic } from './table_vis_basic';

interface TableVisSplitProps {
  fireEvent: IInterpreterRenderHandlers['event'];
  setSort: (s?: TableVisUiState['sort']) => void;
  sort: TableVisUiState['sort'];
  tables: TableGroup[];
  visConfig: TableVisConfig;
}

export const TableVisSplit = memo(
  ({ fireEvent, sort, setSort, tables, visConfig }: TableVisSplitProps) => {
    return (
      <>
        {tables.map(({ tables: dataTable, key, title }) => (
          <div key={key} className="tbvChart__split">
            <TableVisBasic
              fireEvent={fireEvent}
              setSort={setSort}
              sort={sort}
              table={dataTable[0]}
              visConfig={visConfig}
              title={title}
            />
          </div>
        ))}
      </>
    );
  }
);
