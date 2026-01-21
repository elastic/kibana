/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ICommandContext } from '../../registry/types';
import type { ESQLColumn, ESQLIdentifier } from '../../../types';
import { fuzzySearch } from './shared';

export function getColumnExists(
  node: ESQLColumn | ESQLIdentifier,
  { columns }: Pick<ICommandContext, 'columns'>,
  excludeFields = false
) {
  const set = new Set(
    !excludeFields
      ? columns.keys()
      : Array.from(columns.values())
          .filter((col) => col.userDefined)
          .map((col) => col.name)
  );

  return columnIsPresent(node, set);
}

export function columnIsPresent(node: ESQLColumn | ESQLIdentifier, columns: Set<string>) {
  const columnName = node.type === 'identifier' ? node.name : node.parts.join('.');
  if (columns.has(columnName)) {
    return true;
  }

  if (Boolean(fuzzySearch(columnName, columns.values()))) {
    return true;
  }

  return false;
}
