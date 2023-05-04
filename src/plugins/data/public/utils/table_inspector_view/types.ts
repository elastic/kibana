/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { Datatable, DatatableColumn, DatatableRow } from '@kbn/expressions-plugin/common';

type DataViewColumnRender = (value: string, _item: DatatableRow) => React.ReactNode | string;

export interface DataViewColumn {
  originalColumn: () => DatatableColumn;
  name: string;
  field: string;
  sortable: boolean | ((item: DatatableRow) => string | number);
  render: DataViewColumnRender;
}

export type DataViewRow = DatatableRow;

export interface TableInspectorAdapter {
  [key: string]: Datatable;
}
