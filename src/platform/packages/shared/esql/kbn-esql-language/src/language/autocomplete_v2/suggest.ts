/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLCallbacks } from '@kbn/esql-types';
import type { ISuggestionItem } from '../../commands/registry/types';
import { locate } from '../../esql_js_sim/grammar';
import { createContext } from './context';
import { provideColumns, provideConstant, provideNewName } from './providers/arguments';
import { provideCommandNames } from './providers/command_names';
import { provideEndOfCommand, provideToken } from './providers/tokens';
import { resolve } from './resolve';
import type { SuggestionContext, SuggestionRequest } from './types';

const NOTHING_APPLIES: readonly string[] = ['inside_comment', 'inside_string', 'invalid'];

const provideArgument = async (
  { argument, resolved }: Extract<SuggestionRequest, { kind: 'argument' }>,
  context: SuggestionContext
): Promise<ISuggestionItem[]> => {
  // An argument that is already written is offered again only while the cursor is still in it.
  const isBeingTyped = context.ir.position === 'inside_argument' || context.ir.word?.argument;
  if (!resolved || (argument.continues && !isBeingTyped)) {
    return [];
  }

  const { role } = resolved;
  switch (role.kind) {
    case 'column':
      return provideColumns(role, resolved, context);
    case 'new_name':
      return provideNewName(role, context);
    case 'constant':
      return provideConstant(role, context);
    // The providers of the other roles come with the next steps.
    default:
      return [];
  }
};

const provide = async (
  request: SuggestionRequest,
  context: SuggestionContext
): Promise<ISuggestionItem[]> => {
  switch (request.kind) {
    case 'command_names':
      return provideCommandNames(request.commandRules, context);
    case 'token':
      return provideToken(request.follower);
    case 'end_of_command':
      return provideEndOfCommand();
    case 'argument':
      return provideArgument(request, context);
  }
};

/** Keeps the first of the items that insert the same text. */
const present = (items: ISuggestionItem[]): ISuggestionItem[] => {
  const seen = new Set<string>();

  return items.filter(({ text, label }) => {
    const key = `${label}|${text}`;
    const isNew = !seen.has(key);
    seen.add(key);

    return isNew;
  });
};

/**
 * The grammar-driven autocomplete. Four steps: locate the cursor in the grammar, resolve what
 * has to be offered there, provide the items for each request, and present them.
 */
export const suggest = async (
  fullText: string,
  offset: number,
  callbacks?: ESQLCallbacks
): Promise<ISuggestionItem[]> => {
  const ir = locate(fullText, offset);

  if (NOTHING_APPLIES.includes(ir.position)) {
    return [];
  }

  const requests = resolve(ir);
  const context = await createContext(fullText, ir, callbacks);

  const items = await Promise.all(requests.map((request) => provide(request, context)));

  return present(items.flat());
};
