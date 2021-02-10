/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { TabularDataRow } from '../../../common/adapters';

type DataViewColumnRender = (value: string, _item: TabularDataRow) => string;

export interface DataViewColumn {
  name: string;
  field: string;
  sortable: (item: TabularDataRow) => string | number;
  render: DataViewColumnRender;
}

export type DataViewRow = TabularDataRow;
