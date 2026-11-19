/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { isParamLiteral } from '@elastic/esql';
import type { ESQLAst, ESQLAstAllCommands, ESQLAstFillNullCommand } from '@elastic/esql/types';
import type { ESQLMessage } from '../../definitions/types';
import { validateColumnForCommand } from '../../definitions/utils/validation/column';
import type { ICommandContext } from '../types';

export const validate = (
  command: ESQLAstAllCommands,
  ast: ESQLAst,
  context: ICommandContext = { columns: new Map() }
): ESQLMessage[] => {
  const { fields } = command as ESQLAstFillNullCommand;

  // DEFAULT is an identifier in the AST, but not a field reference. Elasticsearch warns
  // about incompatible fill values and leaves those columns unchanged.
  return fields.flatMap((field) =>
    isParamLiteral(field)
      ? []
      : validateColumnForCommand(field, command.name, context, {
          skipUnsupportedOrConflictingColumnValidation: true,
        })
  );
};
