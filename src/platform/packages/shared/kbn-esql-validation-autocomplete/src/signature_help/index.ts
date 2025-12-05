/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Walker, Parser, type ESQLFunction } from '@kbn/esql-ast';
import { within } from '@kbn/esql-ast/src/ast/location';
import {
  getFormattedFunctionSignature,
  getFunctionDefinition,
} from '@kbn/esql-ast/src/definitions/utils';
import type { ESQLCallbacks } from '../shared/types';
import { getColumnsByTypeRetriever } from '../shared/columns_retrieval_helpers';
import { findSubquery } from '../shared/subqueries_helpers';
import { getQueryForFields } from '../shared/get_query_for_fields';
import { correctQuerySyntax } from '../hover/helpers';

const MAX_PARAM_TYPES_TO_SHOW = 3;

export interface SignatureHelpItem {
  signatures: Array<{
    label: string;
    documentation?: string;
    parameters: Array<{
      label: string;
      documentation?: string;
    }>;
  }>;
  activeSignature: number;
  activeParameter: number;
}

export async function getSignatureHelp(
  fullText: string,
  offset: number,
  callbacks?: ESQLCallbacks
): Promise<SignatureHelpItem | undefined> {
  const innerText = fullText.substring(0, offset);

  const correctedQuery = correctQuerySyntax(fullText, offset); // HD hover import
  const { root } = Parser.parse(correctedQuery);

  let fnNode: ESQLFunction | undefined;

  Walker.walk(root, {
    visitFunction: (fn) => {
      const leftParen = fullText.indexOf('(', fn.location.min);
      if (leftParen < offset && within(offset - 1, fn)) {
        fnNode = fn;
      }
    },
  });

  if (!fnNode) {
    return undefined;
  }
  const fnDefinition = getFunctionDefinition(fnNode.name);
  if (!fnDefinition) {
    return undefined;
  }

  // Calculate the argument to highlight based on cursor position
  const currentArgIndex = getArgumentToHighlightIndex(innerText, fnNode, offset);

  const { subQuery } = findSubquery(root, offset);
  const astForContext = subQuery ?? root;

  const { getColumnMap } = getColumnsByTypeRetriever(
    getQueryForFields(fullText, astForContext),
    fullText,
    callbacks
  );
  const columnsMap = await getColumnMap();

  const formattedSignature = getFormattedFunctionSignature(
    fnDefinition,
    fnNode,
    columnsMap,
    '|',
    MAX_PARAM_TYPES_TO_SHOW
  );

  // Extract parameters from formatted signature
  // Example: "count_distinct (\n  field: boolean | date,\n  precision?: integer\n): long"
  // Extract to: ['field: boolean | date', 'precision?: integer']
  const parameters: string[] = [];
  const openParenIndex = formattedSignature.indexOf('(');
  const closeParenIndex = formattedSignature.lastIndexOf(')');

  if (openParenIndex !== -1 && closeParenIndex !== -1 && closeParenIndex > openParenIndex) {
    const paramsSection = formattedSignature.substring(openParenIndex + 1, closeParenIndex);

    // Split by comma and clean up whitespace/newlines
    const paramParts = paramsSection
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
    parameters.push(...paramParts);
  }

  const signature = {
    label: formattedSignature,
    documentation: fnDefinition.description,
    parameters:
      parameters.map((param) => ({
        label: param,
        documentation: 'lalala',
      })) || [],
  };

  return {
    signatures: [signature],
    activeSignature: 0,
    // Math.min for the variadic functions, that can have more arguments than the defined parameters
    activeParameter: Math.min(currentArgIndex, parameters.length - 1),
  };
}

/**
 * Determines which parameter should be highlighted in signature help based on cursor position.
 *
 * @param innerText - The query text up to the cursor position
 * @param fnNode - The function AST node
 * @param offset - The cursor offset in the full query
 * @returns The index of the parameter to highlight (0-based)
 *
 * Examples:
 * - `COUNT_DISTINCT(|` -> 0 (cursor after opening paren)
 * - `COUNT_DISTINCT(field|` -> 0 (cursor within first arg)
 * - `COUNT_DISTINCT(field,|` -> 1 (cursor after comma)
 * - `COUNT_DISTINCT(field, |` -> 1 (cursor after comma with space)
 * - `COUNT_DISTINCT(field, 10|` -> 1 (cursor within second arg)
 */
function getArgumentToHighlightIndex(
  innerText: string,
  fnNode: ESQLFunction,
  offset: number
): number {
  // If cursor is right after opening parenthesis, highlight first parameter
  if (innerText.trimEnd().endsWith('(')) {
    return 0;
  }

  // Find which argument contains or precedes the cursor
  for (let i = 0; i < fnNode.args.length; i++) {
    const arg = fnNode.args[i];

    // Skip if arg doesn't have location info
    if (!arg || (typeof arg === 'object' && !('location' in arg))) {
      continue;
    }

    // Case 1: Cursor is within this argument's range
    if (within(offset - 1, arg)) {
      return i;
    }

    // Case 2: Cursor is after this argument but before the next
    // This handles: `fn(arg1,| arg2)` or `fn(arg1, |arg2)`
    const argEnd = arg.location.max;
    const nextArg = fnNode.args[i + 1];

    if (nextArg && 'location' in nextArg) {
      const nextArgStart = nextArg.location.min;
      // If cursor is between this arg's end and next arg's start, highlight next arg
      if (offset - 1 >= argEnd && offset - 1 < nextArgStart) {
        return i + 1;
      }
    } else if (offset - 1 >= argEnd) {
      // No next argument and cursor is after this arg, highlight the next position
      return i + 1;
    }
  }

  // Default: highlight last argument position
  return Math.max(fnNode.args.length - 1, 0);
}
