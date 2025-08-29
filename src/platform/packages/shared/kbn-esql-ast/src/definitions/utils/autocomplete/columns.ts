/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type {
  ESQLFieldWithMetadata,
  ESQLUserDefinedColumn,
  ICommandContext,
} from '../../../commands_registry/types';
import type { ESQLColumn, ESQLCommand, ESQLIdentifier } from '../../../types';
import { fuzzySearch } from '../shared';

// FIXME
export function excludeUserDefinedColumnsFromCurrentCommand(
  commands: ESQLCommand[],
  currentCommand: ESQLCommand,
  fieldsMap: Map<string, ESQLFieldWithMetadata>,
  queryString: string
) {
  const anyUserDefinedColumns = collectUserDefinedColumns(commands, fieldsMap, queryString);
  const currentCommandUserDefinedColumns = collectUserDefinedColumns(
    [currentCommand],
    fieldsMap,
    queryString
  );
  const resultUserDefinedColumns = new Map<string, ESQLUserDefinedColumn[]>();
  anyUserDefinedColumns.forEach((value, key) => {
    if (!currentCommandUserDefinedColumns.has(key)) {
      resultUserDefinedColumns.set(key, value);
    }
  });
  return resultUserDefinedColumns;
}

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
