/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
