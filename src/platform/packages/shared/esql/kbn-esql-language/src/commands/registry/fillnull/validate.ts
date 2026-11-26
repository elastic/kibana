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
import { getColumnName } from '../../definitions/utils/columns';
import { METADATA_FIELDS, CPS_METADATA_FIELDS } from '../options/metadata/fields';
import { errors } from '../../definitions/utils/errors';
import { isUnmappedFieldsStrategy, UnmappedFieldsStrategy } from '../types';
import type { ICommandCallbacks, ICommandContext } from '../types';

// Stars inside quoted identifiers are literal field-name characters.
const hasWildcard = (text: string): boolean => text.replace(/`(?:``|[^`])*`/g, '').includes('*');
const getPatternMatcher = (text: string): ((name: string) => boolean) => {
  const parts = text.match(/`(?:``|[^`])*`|\*|[^`*]+/g) ?? [];
  const segments = [''];
  for (const part of parts) {
    if (part === '*') {
      segments.push('');
    } else {
      const literal = part.startsWith('`') ? part.slice(1, -1).replace(/``/g, '`') : part;
      segments[segments.length - 1] += literal;
    }
  }

  // Match literal segments in order without backtracking, reserving the anchored suffix.
  return (name) => {
    const prefix = segments[0];
    const suffix = segments[segments.length - 1];
    if (segments.length === 1) return name === prefix;
    if (!name.startsWith(prefix) || !name.endsWith(suffix)) return false;
    const end = name.length - suffix.length;
    let position = prefix.length;
    for (const segment of segments.slice(1, -1)) {
      const index = name.indexOf(segment, position);
      if (index === -1 || index + segment.length > end) return false;
      position = index + segment.length;
    }
    return position <= end;
  };
};

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

    const matcher = hasWildcard(field.text) ? getPatternMatcher(field.text) : undefined;
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
              .filter((column) => !isParametrized(column) && !hasWildcard(column.text))
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
