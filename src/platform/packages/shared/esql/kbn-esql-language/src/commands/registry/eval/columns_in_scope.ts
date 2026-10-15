/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLAstQueryExpression } from '@elastic/esql/types';
import type { ColumnsInScopeParams } from '../registry';
import { getBracketsToClose } from '../../definitions/utils/ast';
import { endsWithComma } from '../../definitions/utils/regex';
import { expandEvals } from '../../../language/shared/expand_evals';

/**
 * In a multi-expression EVAL the earlier columns are in scope for later ones. To make that work
 * with the field computation (which delineates availability by pipes), split the EVAL into an
 * equivalent chain of single-expression EVALs and drop the one being typed at the cursor.
 *
 * Original query: FROM lolz | EVAL foo = 1, bar = foo + 1, baz = /
 * Simplified:     FROM lolz | EVAL foo = 1 | EVAL bar = foo + 1
 */
export const columnsInScope = ({
  root,
  queryString,
}: ColumnsInScopeParams): ESQLAstQueryExpression | undefined => {
  const { commands } = root;
  const lastCommand = commands[commands.length - 1];

  const hasTrailingSeparatorComma =
    getBracketsToClose(queryString).length === 0 && endsWithComma(queryString);

  if (lastCommand.args.length <= 1 && !hasTrailingSeparatorComma) {
    return undefined;
  }

  const expanded = expandEvals(commands);
  const newCommands = expanded.slice(0, hasTrailingSeparatorComma ? undefined : -1);
  return { ...root, commands: newCommands };
};
