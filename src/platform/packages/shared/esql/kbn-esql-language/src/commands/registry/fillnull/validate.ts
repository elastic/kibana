/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { isColumn, isParamLiteral, isParametrized, Walker } from '@elastic/esql';
import type { ESQLAst, ESQLAstAllCommands, ESQLAstFillNullCommand } from '@elastic/esql/types';
import type { ESQLMessage } from '../../definitions/types';
import { validateColumnForCommand } from '../../definitions/utils/validation/column';
import { columnIsPresent, getColumnExists, getColumnName } from '../../definitions/utils/columns';
import { errors } from '../../definitions/utils/errors';
import { isUnmappedFieldsStrategy, UnmappedFieldsStrategy } from '../types';
import type { ICommandContext } from '../types';

// Stars inside quoted identifiers are literal field-name characters.
const hasWildcard = (text: string): boolean => text.replace(/`(?:``|[^`])*`/g, '').includes('*');

export const validate = (
  command: ESQLAstAllCommands,
  ast: ESQLAst,
  context: ICommandContext = { columns: new Map() }
): ESQLMessage[] => {
  const { fields } = command as ESQLAstFillNullCommand;

  // DEFAULT is an identifier in the AST, but not a field reference. Elasticsearch warns
  // about incompatible fill values and leaves those columns unchanged.
  return fields.flatMap((field) => {
    if (isParamLiteral(field)) {
      return [];
    }

    if (hasWildcard(field.text) && !getColumnExists(field, context)) {
      const canLoadFields =
        isUnmappedFieldsStrategy(context.unmappedFieldsStrategy) &&
        context.unmappedFieldsStrategy !== UnmappedFieldsStrategy.DEFAULT;
      // ES can load exact targets here or references later in the pipeline before resolving patterns.
      // Keep the warning when such a reference may satisfy the pattern; the server resolves it.
      const loadableNames = canLoadFields
        ? new Set(
            [...fields, ...Walker.findAll(ast, (node) => node.location.min > command.location.max)]
              .filter(isColumn)
              .filter((column) => !isParametrized(column) && !hasWildcard(column.text))
              .map(getColumnName)
          )
        : new Set<string>();

      if (!columnIsPresent(field, loadableNames)) {
        return [errors.unknownColumn(field)];
      }
    }

    return validateColumnForCommand(field, command.name, context, {
      skipUnsupportedColumnValidation: true,
    });
  });
};
