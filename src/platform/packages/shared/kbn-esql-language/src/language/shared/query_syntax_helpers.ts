/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getBracketsToClose } from '../../commands/definitions/utils/ast';

/**
 * Corrects the query syntax by closing any unclosed brackets and removing incomplete args.
 * @param offset
 * @param query
 * @returns
 */
export function correctQuerySyntax(query: string, offset: number): string {
  // Dispose any following commands after the current offset
  const nextPipeIndex = query.indexOf('|', offset);
  if (nextPipeIndex !== -1) {
    query = query.substring(0, nextPipeIndex);
  }

  // Close any pending to be closed bracket
  const bracketsToAppend = getBracketsToClose(query);
  query += bracketsToAppend.join('');

  // Replace partially written function arguments: ,) with )
  // It preserves the spaces in the query: func(arg1,   ) => func(arg1   )
  query = query.replace(/,(\s*)\)/g, '$1)');

  return query;
}
