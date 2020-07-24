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
import { EuiTitle } from '@elastic/eui';

import { ExprVis } from 'src/plugins/visualizations/public';
import { TableGroup } from '../table_vis_response_handler';
import { TableVisParams } from '../types';
import { TableVisBasic } from './table_vis_basic';

interface TableVisSplitProps {
  tables: TableGroup[];
  vis: ExprVis;
  visParams: TableVisParams;
}

export const TableVisSplit = memo(({ tables, vis, visParams }: TableVisSplitProps) => {
  return (
    <>
      {tables.map(({ tables: dataTable, key, title }) => (
        <div key={key} className="tbvChart__split">
          <EuiTitle size="xs">
            <h3>{title}</h3>
          </EuiTitle>
          <TableVisBasic table={dataTable[0]} vis={vis} visParams={visParams} />
        </div>
      ))}
    </>
  );
});
