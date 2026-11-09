/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiDataGridAdapter } from './table_grid/eui_data_grid_adapter';
import {
  GRID_COLUMN_FIELD_NAME,
  GRID_COLUMN_FIELD_VALUE,
  useTableGridModel,
  type UseTableGridModelParams,
} from './table_grid/use_table_grid_model';

export type TableGridProps = UseTableGridModelParams;

export { GRID_COLUMN_FIELD_NAME, GRID_COLUMN_FIELD_VALUE };

export function TableGrid(props: TableGridProps) {
  const model = useTableGridModel(props);
  return <EuiDataGridAdapter model={model} />;
}
