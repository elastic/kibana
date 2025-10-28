/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { Walker, type WalkerAstNode } from '@kbn/esql-ast';
import { getBracketsToClose } from '@kbn/esql-ast/src/definitions/utils/ast';
import type { ESQLControlVariable } from '@kbn/esql-types';

export const getVariablesHoverContent = (
  node?: WalkerAstNode,
  variables?: ESQLControlVariable[]
) => {
  const usedVariablesInNode = node ? Walker.params(node).map((v) => v.text.replace('?', '')) : [];
  const usedVariables = variables?.filter((v) => usedVariablesInNode.includes(v.key));

  const hoverContents: Array<{ value: string }> = [];

  if (usedVariables?.length) {
    usedVariables.forEach((variable) => {
      hoverContents.push({
        value: `**${variable.key}**: ${variable.value}`,
      });
    });
  }

  return hoverContents;
};

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
  query = query.replace(/,\s*\)/g, ')');

  return query;
}
