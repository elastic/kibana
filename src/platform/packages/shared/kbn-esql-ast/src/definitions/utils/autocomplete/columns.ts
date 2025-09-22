/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ICommandContext } from '../../../commands_registry/types';
import type { ESQLColumn, ESQLIdentifier } from '../../../types';
import { fuzzySearch } from '../shared';

/**
 * TODO - consider calling lookupColumn under the hood of this function. Seems like they should really do the same thing.
 */
export function getColumnExists(node: ESQLColumn | ESQLIdentifier, { columns }: ICommandContext) {
  const columnName = node.type === 'identifier' ? node.name : node.parts.join('.');
  if (columns.has(columnName)) {
    return true;
  }

  // TODO — I don't see this fuzzy searching in lookupColumn... should it be there?
  if (Boolean(fuzzySearch(columnName, columns.keys()))) {
    return true;
  }

  return false;
}
