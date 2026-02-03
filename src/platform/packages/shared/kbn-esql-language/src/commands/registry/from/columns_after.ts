/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { uniqBy } from 'lodash';
import { esqlCommandRegistry } from '..';
import { isSubQuery } from '../../../ast/is';
import { type ESQLCommand, type ESQLAstQueryExpression } from '../../../types';
import type { ESQLColumnData } from '../types';
import { UnmappedFieldsStrategy } from '../types';
import type { IAdditionalFields } from '../registry';

export const columnsAfter = async (
  command: ESQLCommand,
  _previousColumns: ESQLColumnData[], // will always be empty for FROM
  query: string,
  additionalFields: IAdditionalFields,
  unmappedFieldsStrategy: UnmappedFieldsStrategy = UnmappedFieldsStrategy.FAIL
) => {
  const options = command.args.filter((arg) => !Array.isArray(arg) && arg.type === 'option');
  const sources = command.args.filter((arg) => !Array.isArray(arg) && arg.type === 'source');
  const subqueries = command.args.filter(isSubQuery);

  const promises = [
    ...sources.map((source) =>
      additionalFields.fromFrom({ ...command, args: [source, ...options] })
    ),
    ...subqueries.map((subquery) =>
      processSubquery(subquery.child, query, additionalFields, unmappedFieldsStrategy)
    ),
  ];

  const results = await Promise.all(promises);
  const allColumns = results.flat();

  return uniqBy(allColumns, 'name');
};

async function processSubquery(
  subquery: ESQLAstQueryExpression,
  query: string,
  additionalFields: IAdditionalFields,
  unmappedFieldsStrategy: UnmappedFieldsStrategy
): Promise<ESQLColumnData[]> {
  let columns: ESQLColumnData[] = [];

  // Execute each command in subquery pipeline: FROM index | KEEP
  for (const subCommand of subquery.commands) {
    const commandDef = esqlCommandRegistry.getCommandByName(subCommand.name);

    if (commandDef?.methods?.columnsAfter) {
      columns = await commandDef.methods.columnsAfter(
        subCommand,
        columns,
        query,
        additionalFields,
        unmappedFieldsStrategy
      );
    }
  }

  return columns;
}
