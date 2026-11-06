/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLAstAllCommands } from '@elastic/esql/types';
import { isBinaryExpression, isSubQuery, isUnknownNode } from '@elastic/esql';
import { endsWithWhitespace, getTrailingIdentifier } from '../../definitions/utils/regex';
import {
  assignCompletionItem,
  buildSubqueryCompleteItems,
  semiColonCompleteItem,
} from '../complete_items';
import type { ICommandCallbacks, ICommandContext, ISuggestionItem } from '../types';

// LET <name> = (<subquery>);
// The cursor within the binding subquery is handled as a regular subquery context.
export async function autocomplete(
  query: string,
  command: ESQLAstAllCommands,
  _callbacks?: ICommandCallbacks,
  context?: ICommandContext,
  cursorPosition?: number
): Promise<ISuggestionItem[]> {
  const innerText = query.substring(0, cursorPosition);
  const binding = command.args[0];
  const bindingRightSide = isBinaryExpression(binding) ? binding.args[1] : null;

  const hasSemicolonAtEnd = query
    .substring(cursorPosition ?? query.length)
    .trimStart()
    .startsWith(';');

  if (!binding) {
    // The parser does not keep the binding name until '=' is typed.
    const bindingText = innerText.slice(command.location.min + command.name.length).trim();

    // LET <name> /
    if (getTrailingIdentifier(bindingText) === bindingText && endsWithWhitespace(innerText)) {
      return [{ ...assignCompletionItem, detail: '' }];
    }

    // LET /
    if (!bindingText && endsWithWhitespace(innerText)) {
      const existingNames = new Set(context?.namedSubqueries?.map(({ name }) => name));
      let counter = 0;
      while (existingNames.has(`subquery${counter}`)) {
        counter++;
      }
      const name = `subquery${counter}`;

      return [{ ...assignCompletionItem, label: name, text: `${name} = `, detail: '' }];
    }

    return [];
  }

  // LET <name> = /
  // The parser can recover the missing body as an empty subquery.
  if (
    !bindingRightSide ||
    isUnknownNode(bindingRightSide) ||
    (Array.isArray(bindingRightSide) && bindingRightSide.length === 0) ||
    (isSubQuery(bindingRightSide) && bindingRightSide.child.commands.length === 0)
  ) {
    return buildSubqueryCompleteItems().map((suggestion) => ({
      ...suggestion,
      text: hasSemicolonAtEnd ? suggestion.text : `${suggestion.text};`,
    }));
  }

  // LET <name> = (<subquery>)/
  // Inside the subquery, suggestions are handled by its own command.
  if (
    isBinaryExpression(binding) &&
    !binding.incomplete &&
    isSubQuery(bindingRightSide) &&
    !hasSemicolonAtEnd
  ) {
    return [
      {
        ...semiColonCompleteItem,
        text: ';\n', // Add a new line so the next instruction starts in the line below.
      },
    ];
  }

  return [];
}
