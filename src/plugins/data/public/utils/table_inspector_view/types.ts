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

import { Datatable, DatatableColumn, DatatableRow } from '../../../../expressions/common';

type DataViewColumnRender = (value: string, _item: DatatableRow) => string;

export interface DataViewColumn {
  originalColumn: () => DatatableColumn;
  name: string;
  field: string;
  sortable: (item: DatatableRow) => string | number;
  render: DataViewColumnRender;
}

export type DataViewRow = DatatableRow;

export interface TableInspectorAdapter {
  [key: string]: Datatable;
}
