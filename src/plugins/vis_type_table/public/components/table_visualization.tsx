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

import React, { useEffect, useMemo } from 'react';

import { ReactVisComponentProps } from 'src/plugins/visualizations/public';
import { TableVisParams } from '../types';
import { TableContext } from '../table_vis_response_handler';
import { TableVisBasic } from './table_vis_basic';
import { TableVisSplit } from './table_vis_split';

export const TableVisualization = ({
  renderComplete,
  vis,
  visData: { direction, table, tables },
  visParams,
}: ReactVisComponentProps<TableContext, TableVisParams>) => {
  useEffect(() => {
    renderComplete();
  }, [renderComplete]);

  return table ? (
    <TableVisBasic table={table} vis={vis} visParams={visParams} />
  ) : (
    <TableVisSplit tables={tables} vis={vis} visParams={visParams} />
  );
};
