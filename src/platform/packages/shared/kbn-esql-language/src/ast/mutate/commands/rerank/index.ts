/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isStringLiteral } from '../../../is';
import { Builder } from '../../../builder';
import type {
  ESQLAstQueryExpression,
  ESQLAstRerankCommand,
  ESQLCommandOption,
  ESQLStringLiteral,
  ESQLParamLiteral,
  ESQLMap,
  ESQLAstItem,
  ESQLMapEntry,
  ESQLLiteral,
} from '../../../../types';
import * as generic from '../../generic';

/**
 * Lists all "RERANK" commands in the query AST.
 *
 * @param ast The root AST node to search for "RERANK" commands.
 * @returns A collection of "RERANK" commands.
 */
export const list = (ast: ESQLAstQueryExpression): IterableIterator<ESQLAstRerankCommand> => {
  return generic.commands.list(
    ast,
    (cmd) => cmd.name === 'rerank'
  ) as IterableIterator<ESQLAstRerankCommand>;
};

/**
 * Sets or updates the query text for the RERANK command.
 *
 * @param cmd The RERANK command AST node to modify.
 * @param query The query text to set.
 */
export const setQuery = (cmd: ESQLAstRerankCommand, query: string | ESQLStringLiteral) => {
  const queryLiteral = typeof query === 'string' ? Builder.expression.literal.string(query) : query;
  const firstArg = cmd.args[0];

  cmd.query = queryLiteral;

  if (
    firstArg &&
    !Array.isArray(firstArg) &&
    firstArg.type === 'function' &&
    firstArg.name === '='
  ) {
    // It's an assignment, update the right side of the expression
    firstArg.args[1] = queryLiteral;
  } else {
    // It's a simple query, replace the first argument
    cmd.args[0] = queryLiteral;
  }
};

/**
 * Sets, updates, or removes the target field for the RERANK command.
 * This refers to the `targetField =` portion of the command, which specifies                                  │
 * the new column where the rerank score will be stored.                                                       │
 *
 * @param cmd The RERANK command AST node to modify.
 * @param target The name of the target field to set. If `null` the assignment is removed.
 */
export const setTargetField = (cmd: ESQLAstRerankCommand, target: string | null) => {
  const firstArg = cmd.args[0];
  const isAssignment =
    firstArg && !Array.isArray(firstArg) && firstArg.type === 'function' && firstArg.name === '=';

  // Case 1: Set a new target field
  if (target !== null) {
    const newTargetColumn = Builder.expression.column(target);

    if (isAssignment) {
      // An assignment already exists => update the target field
      firstArg.args[0] = newTargetColumn;
    } else {
      // No assignment exists => create one
      const queryLiteral = cmd.query;
      const assignment = Builder.expression.func.binary('=', [newTargetColumn, queryLiteral]);
      cmd.args[0] = assignment;
    }

    cmd.targetField = newTargetColumn;
  }
  // Case 2: Remove the target field
  else {
    if (isAssignment) {
      // An assignment exists, keep only the query
      const queryLiteral = cmd.query;
      cmd.args[0] = queryLiteral;
    }
    // If no assignment exists, do nothing
    cmd.targetField = undefined;
  }
};

/**
 * Sets or updates the fields to be used for reranking in the ON clause.
 *
 * @param cmd The RERANK command AST node to modify.
 * @param fields An array of field names or field nodes.
 */
export const setFields = (
  cmd: ESQLAstRerankCommand,
  fields: string[] | ESQLAstRerankCommand['fields']
) => {
  if (typeof fields[0] === 'string') {
    fields = fields.map((fieldOrFieldName) => {
      return typeof fieldOrFieldName === 'string'
        ? Builder.expression.column(fieldOrFieldName)
        : fieldOrFieldName;
    });
  }

  const isOnOption = (arg: ESQLAstItem): arg is ESQLCommandOption =>
    !!arg && !Array.isArray(arg) && arg.type === 'option' && arg.name === 'on';

  const onOption = cmd.args.find(isOnOption);

  if (!onOption) {
    throw new Error('RERANK command must have a ON option');
  }

  cmd.fields.length = 0;
  cmd.fields.push(...(fields as ESQLAstRerankCommand['fields']));

  onOption.args.length = 0;
  onOption.args.push(...(fields as ESQLAstRerankCommand['fields']));
};

/**
 * Sets a parameter in the WITH clause of the RERANK command (e.g., 'inference_id').
 * If the parameter already exists, its value is updated. Otherwise, it is added.
 *
 * @param cmd The RERANK command AST node to modify.
 * @param key The name of the parameter to set.
 * @param value The value of the parameter.
 */
export const setWithParameter = (
  cmd: ESQLAstRerankCommand,
  key: string,
  value: string | ESQLStringLiteral | ESQLParamLiteral
) => {
  // Converts a value to an appropriate ESQLExpression based on its type
  const toExpression = (val: string | ESQLLiteral | ESQLParamLiteral) => {
    if (typeof val === 'string') {
      return val.startsWith('?')
        ? Builder.param.build(val)
        : Builder.expression.literal.string(val);
    }
    return val;
  };

  const isWithOption = (arg: ESQLAstItem): arg is ESQLCommandOption =>
    !!arg && !Array.isArray(arg) && arg.type === 'option' && arg.name === 'with';

  // Validates and retrieves the map from a WITH option
  const getWithOptionMap = (withOption: ESQLCommandOption): ESQLMap => {
    const mapArg = withOption.args[0];

    if (!mapArg || typeof mapArg === 'string' || Array.isArray(mapArg) || mapArg.type !== 'map') {
      throw new Error('WITH option must contain a map');
    }

    return mapArg as ESQLMap;
  };

  // Normalizes a key for comparison by removing quotes
  const normalizeKey = (keyValue: string | undefined): string => {
    return keyValue?.replace(/"/g, '') ?? '';
  };

  // Checks if an entry in the map has the specified key
  // normalizeKey avoid cases like: "inference_id" === "'inferenceId"' -> this is false
  const getKeyValue = (entry: ESQLMapEntry): string | undefined => {
    const k = entry.key;
    if (isStringLiteral(k)) {
      return k.valueUnquoted ?? k.value;
    }
    return undefined;
  };

  const getExistingEntry = (entry: ESQLMapEntry) => normalizeKey(getKeyValue(entry)) === key;

  // Creates a new map entry with the given key and value
  const createMapEntry = (entryKey: string, entryValue: ESQLLiteral | ESQLParamLiteral) => ({
    type: 'map-entry' as const,
    name: 'map-entry' as const,
    key: Builder.expression.literal.string(entryKey),
    value: entryValue,
    location: { min: 0, max: 0 },
    text: '',
    incomplete: false,
  });

  const withOption = cmd.args.find(isWithOption);

  if (!withOption) {
    throw new Error('RERANK command must have a WITH option');
  }

  const valueExpression = toExpression(value);
  const map = getWithOptionMap(withOption);
  const existingEntry = map.entries.find(getExistingEntry);

  if (existingEntry) {
    existingEntry.value = valueExpression;
  } else {
    map.entries.push(createMapEntry(key, valueExpression));
  }
};
