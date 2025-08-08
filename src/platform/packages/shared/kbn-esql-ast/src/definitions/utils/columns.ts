/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ICommandContext } from '../../commands_registry/types';
import type { ESQLColumn, ESQLIdentifier } from '../../types';
import { fuzzySearch } from './shared';

/**
 * This returns the name with any quotes that were present.
 *
 * E.g. "`bytes`" will be "`bytes`"
 *
 * @param node
 * @returns
 */
export const getQuotedColumnName = (node: ESQLColumn | ESQLIdentifier) =>
  node.type === 'identifier' ? node.name : node.quoted ? node.text : node.name;

/**
 * TODO - consider calling lookupColumn under the hood of this function. Seems like they should really do the same thing.
 */
export function getColumnExists(
  node: ESQLColumn | ESQLIdentifier,
  { fields, userDefinedColumns }: Pick<ICommandContext, 'fields' | 'userDefinedColumns'>
) {
  const columnName = node.type === 'identifier' ? node.name : node.parts.join('.');
  if (fields.has(columnName) || userDefinedColumns.has(columnName)) {
    return true;
  }

  // TODO — I don't see this fuzzy searching in lookupColumn... should it be there?
  if (
    Boolean(
      fuzzySearch(columnName, fields.keys()) || fuzzySearch(columnName, userDefinedColumns.keys())
    )
  ) {
    return true;
  }

  return false;
}
