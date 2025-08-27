/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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
} from '../../../types';
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

export const setQuery = (cmd: ESQLAstRerankCommand, query: string | ESQLStringLiteral) => {
  if (typeof query === 'string') {
    query = Builder.expression.literal.string(query);
  }

  cmd.query = query;
  cmd.args[0] = query;
};

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

  cmd.fields.length = 0;
  cmd.fields.push(...(fields as ESQLAstRerankCommand['fields']));

  const isOnOption = (arg: ESQLAstItem): arg is ESQLCommandOption =>
    !!arg && !Array.isArray(arg) && arg.type === 'option' && arg.name === 'on';

  const onOption = cmd.args.find(isOnOption);
  if (onOption) {
    onOption.args.length = 0;
    onOption.args.push(...(fields as ESQLAstRerankCommand['fields']));
  }
};

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

  // Type guard to check if an AST item is a WITH option
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
  const getExistingEntry = (entry: ESQLMapEntry) =>
    normalizeKey(entry.key.valueUnquoted ?? entry.key.value) === key;

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

  // Find the WITH option in the command arguments
  const withOption = cmd.args.find(isWithOption);

  if (!withOption) {
    throw new Error('RERANK command must have a WITH option');
  }

  // Get and validate the map from the WITH option
  const valueExpression = toExpression(value);
  // Look for existing entry with the same key
  const map = getWithOptionMap(withOption);
  const existingEntry = map.entries.find(getExistingEntry);

  if (existingEntry) {
    existingEntry.value = valueExpression;
  } else {
    map.entries.push(createMapEntry(key, valueExpression));
  }
};
