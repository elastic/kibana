/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { within, Walker } from '../../ast';
import type { ESQLAstBaseItem, ESQLFunction } from '../../types';
import type { PromQLFunction } from '../../embedded_languages/promql/types';
import { getFormattedPromqlFunctionSignature } from '../../commands/definitions/utils/hover/functions';
import { getPromqlFunctionDefinition } from '../../commands/definitions/utils/promql';

/**
 * Extracts the parameter list from a formatted function signature.
 */
export function getParameterList(formattedSignature: string) {
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
  return parameters;
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
export function getArgumentToHighlightIndex(
  innerText: string,
  fnNode: ESQLFunction | { args: Array<Pick<ESQLAstBaseItem, 'location'>> },
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

export function getPromqlSignatureHelp(
  root: Parameters<typeof Walker.walk>[0],
  fullText: string,
  offset: number
) {
  let functionNode: PromQLFunction | undefined;

  Walker.walk(root, {
    promql: {
      visitPromqlFunction: (fn) => {
        const leftParen = fullText.indexOf('(', fn.location.min);
        if (leftParen < offset && (within(offset - 1, fn) || fn.incomplete)) {
          functionNode = fn;
        }
      },
    },
  });

  if (!functionNode) {
    return undefined;
  }

  const fnDefinition = getPromqlFunctionDefinition(functionNode.name);
  if (!fnDefinition) {
    return undefined;
  }

  const innerText = fullText.substring(0, offset);
  const currentArgIndex = getArgumentToHighlightIndex(innerText, functionNode, offset);
  const formattedSignature = getFormattedPromqlFunctionSignature(fnDefinition);
  const parameters = getParameterList(formattedSignature);

  return buildSignatureHelpItem(formattedSignature, fnDefinition, parameters, currentArgIndex);
}

export function buildSignatureHelpItem(
  formattedSignature: string,
  fnDefinition: {
    description?: string;
    signatures?: Array<{ params: Array<{ name: string; description?: string }> }>;
  },
  parameters: string[],
  currentArgIndex: number
) {
  return {
    signatures: [
      {
        label: formattedSignature,
        documentation: fnDefinition.description,
        parameters: parameters.map((param) => ({
          label: param,
          documentation:
            fnDefinition.signatures
              ?.flatMap((sig) => sig.params)
              .find((p) => param.startsWith(p.name))?.description ?? '',
        })),
      },
    ],
    activeSignature: 0,
    activeParameter: Math.min(currentArgIndex, parameters.length - 1),
  };
}
