/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { uniqBy } from 'lodash';
import type { ESQLFieldWithMetadata } from '@kbn/esql-types';
import { esqlCommandRegistry } from '../../../..';
import type { ESQLAstAllCommands, ESQLAstForkCommand } from '../../../types';
import type { ESQLColumnData } from '../types';
import { UnmappedFieldsStrategy } from '../types';
import type { IAdditionalFields } from '../registry';

export const columnsAfter = async (
  command: ESQLAstAllCommands,
  previousColumns: ESQLColumnData[],
  query: string,
  additionalFields: IAdditionalFields,
  unmappedFieldsStrategy: UnmappedFieldsStrategy = UnmappedFieldsStrategy.FAIL
) => {
  const forkCommand = command as ESQLAstForkCommand;
  const branches = forkCommand.args.map((parens) => parens.child);

  const columnsFromBranches = [];

  for (const branch of branches) {
    // start with columns from before FORK
    let columnsFromBranch = [...previousColumns];
    for (const branchCommand of branch.commands) {
      const commandDef = esqlCommandRegistry.getCommandByName(branchCommand.name);
      if (commandDef?.methods?.columnsAfter) {
        columnsFromBranch = await commandDef.methods?.columnsAfter?.(
          branchCommand,
          columnsFromBranch,
          query,
          additionalFields,
          unmappedFieldsStrategy
        );
      }
    }

    columnsFromBranches.push(columnsFromBranch);
  }

  const maps = columnsFromBranches.map((cols) => new Map(cols.map((_col) => [_col.name, _col])));

  const merged = new Map<string, ESQLColumnData>();

  // O(b * n), where b is the branches and n is the max number of columns in a branch
  for (const map of maps) {
    for (const [name, colData] of map) {
      /**
       * Check for conflicts...
       *
       * The branches often produce large numbers of columns with the same names
       * because they will often include most or all fields in their results.
       *
       * Sometimes, user-defined columns have been created that overwrite
       * fields with the same name, in which case user-defined columns should win.
       *
       * In other cases, the branches may define columns of the same name but with different
       * data types. That is not allowed but, to keep things simple, we don't touch that case...
       * we leave it to Elasticsearch validation.
       */
      if (merged.has(name)) {
        const existingColData = merged.get(name) as ESQLColumnData;
        if (existingColData.userDefined) {
          // If the existing column is user-defined and the new one is not, keep the existing one
          continue;
        } else if (!existingColData.userDefined && colData.userDefined) {
          // If the existing column is not user-defined and the new one is, use the new one
          merged.set(name, colData);
          continue;
        } else {
          // If both columns are user-defined or both are not, keep the existing one
          continue;
        }
      }

      merged.set(name, colData);
    }
  }

  return uniqBy(
    [
      ...merged.values(),
      {
        name: '_fork',
        type: 'keyword' as const,
        userDefined: false,
      } as ESQLFieldWithMetadata,
    ],
    'name'
  );
};
