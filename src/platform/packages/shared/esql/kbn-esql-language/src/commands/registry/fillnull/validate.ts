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
import { getFieldPatternMatcher } from '../../definitions/utils/regex';
import { getColumnName } from '../../definitions/utils/columns';
import { METADATA_FIELDS, CPS_METADATA_FIELDS } from '../options/metadata/fields';
import { errors } from '../../definitions/utils/errors';
import { isUnmappedFieldsStrategy, UnmappedFieldsStrategy } from '../types';
import type { ICommandCallbacks, ICommandContext } from '../types';

export const validate = (
  command: ESQLAstAllCommands,
  ast: ESQLAst,
  context: ICommandContext = { columns: new Map() },
  callbacks?: ICommandCallbacks
): ESQLMessage[] => {
  const { fields } = command as ESQLAstFillNullCommand;
  const metadataFields = new Set([
    ...METADATA_FIELDS,
    ...(callbacks?.isServerless ? CPS_METADATA_FIELDS : []),
  ]);

  // DEFAULT is an identifier in the AST, but not a field reference. Elasticsearch warns
  // about incompatible fill values and leaves those columns unchanged.
  return fields.flatMap((field) => {
    if (isParamLiteral(field)) {
      return [];
    }

    const fieldName = getColumnName(field);
    if (metadataFields.has(fieldName) && !context.columns.has(fieldName)) {
      return [errors.unknownColumn(field)];
    }

    const matcher = getFieldPatternMatcher(field.text);
    if (matcher) {
      if ([...context.columns.keys()].some(matcher)) {
        return [];
      }
      const canLoadFields =
        isUnmappedFieldsStrategy(context.unmappedFieldsStrategy) &&
        context.unmappedFieldsStrategy !== UnmappedFieldsStrategy.DEFAULT;
      // ES can load exact targets here or references later in the pipeline before resolving patterns.
      // Keep the warning when such a reference may satisfy the pattern; the server resolves it.
      const loadableNames = canLoadFields
        ? new Set(
            [...fields, ...Walker.findAll(ast, (node) => node.location.min > command.location.max)]
              .filter(isColumn)
              .filter((column) => !isParametrized(column) && !getFieldPatternMatcher(column.text))
              .map(getColumnName)
              .filter((name) => !metadataFields.has(name))
          )
        : new Set<string>();

      if (![...loadableNames].some(matcher)) {
        return [errors.unknownColumn(field)];
      }
    }

    return validateColumnForCommand(field, command.name, context, {
      skipUnsupportedColumnValidation: true,
    });
  });
};
