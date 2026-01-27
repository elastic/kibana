/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLColumn } from '../../types';
import type { GetColumnMapFn } from '../shared/columns_retrieval_helpers';

export async function getColumnHover(
  node: ESQLColumn,
  getColumnMap: GetColumnMapFn
): Promise<Array<{ value: string }>> {
  const columnsMap = await getColumnMap();
  const columnData = columnsMap.get(node.name);
  if (columnData) {
    return [
      {
        value: `**${node.name}**: ${columnData.type}`,
      },
    ];
  }
  return [];
}
