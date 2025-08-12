/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  createColumnHelper,
  getCoreRowModel,
  getExpandedRowModel,
  useReactTable,
  type TableOptions,
  type ColumnDef,
} from '@tanstack/react-table';
import type { GroupNode } from '../../../store_provider';

interface TableProps<G>
  extends Omit<TableOptions<G>, 'columns' | 'data' | 'getCoreRowModel' | 'getExpandedRowModel'> {
  columns: (columnsHelper: ReturnType<typeof createColumnHelper<G>>) => ColumnDef<G>[];
  data: Array<G>;
}

export const useTableHelper = <G extends GroupNode>({ columns, data, ...rest }: TableProps<G>) => {
  const columnHelper = createColumnHelper<G>();

  return useReactTable<G>({
    data,
    columns: columns(columnHelper),
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    ...rest,
  });
};
