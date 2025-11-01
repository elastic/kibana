/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { uniqBy } from 'lodash';
import { esqlCommandRegistry } from '../..';
import { isSubQuery } from '../../../ast/is';
import { type ESQLCommand, type ESQLAstQueryExpression } from '../../../types';
import type { ESQLColumnData } from '../../types';
import type { IAdditionalFields } from '../../registry';

export const columnsAfter = async (
  command: ESQLCommand,
  _previousColumns: ESQLColumnData[],
  query: string,
  additionalFields: IAdditionalFields
) => {
  // Process each source/subquery: FROM index1, (FROM index2 | KEEP a), index3
  const promises = command.args.map((arg) => {
    if (isSubQuery(arg)) {
      return processSubquery(arg.child, query, additionalFields);
    } else {
      return additionalFields.fromFrom({ ...command, args: [arg] });
    }
  });

  const results = await Promise.all(promises);
  const allColumns = results.flat();

  return uniqBy(allColumns, 'name');
};

async function processSubquery(
  subquery: ESQLAstQueryExpression,
  query: string,
  additionalFields: IAdditionalFields
): Promise<ESQLColumnData[]> {
  let columns: ESQLColumnData[] = [];

  // Execute each command in subquery pipeline: FROM index | KEEP
  for (const subCommand of subquery.commands) {
    const commandDef = esqlCommandRegistry.getCommandByName(subCommand.name);

    if (commandDef?.methods?.columnsAfter) {
      columns = await commandDef.methods.columnsAfter(subCommand, columns, query, additionalFields);
    }
  }

  return columns;
}
