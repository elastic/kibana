/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLAstForkCommand, ESQLAstQueryExpression } from '@elastic/esql/types';
import type { ColumnsInScopeParams } from '../registry';

/**
 * When the cursor is inside a FORK branch, the columns in scope are those produced by the branch
 * so far. Flatten the current branch into a simpler but equivalent query — dropping the branch's
 * own partial command at the cursor — so the field computation can handle it like any pipeline.
 *
 * Original query: FROM lolz | EVAL foo = 1 | FORK (EVAL bar = 2) (EVAL baz = 3 | WHERE /)
 * Simplified:     FROM lolz | EVAL foo = 1 | EVAL baz = 3
 */
export const columnsInScope = ({
  root,
}: ColumnsInScopeParams): ESQLAstQueryExpression | undefined => {
  const { commands } = root;
  const forkCommand = commands[commands.length - 1] as ESQLAstForkCommand;

  if (forkCommand.args.length === 0) {
    return undefined;
  }

  const currentBranch = forkCommand.args[forkCommand.args.length - 1].child;
  const newCommands = commands.slice(0, -1).concat(currentBranch.commands.slice(0, -1));
  return { ...root, commands: newCommands };
};
