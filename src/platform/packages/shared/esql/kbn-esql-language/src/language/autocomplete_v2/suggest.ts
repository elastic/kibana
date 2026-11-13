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
import {
  EXPRESSION_PARTS,
  type ArgumentRole,
  type ResolvedRole,
  type RoleKind,
} from '../../esql_js_sim/definitions';
import { locate, type ExpectedArgument } from '../../esql_js_sim/grammar';
import { createContext } from './context';
import { provideColumns, provideConstant, provideNewName } from './providers/arguments';
import { provideCommandNames } from './providers/command_names';
import { provideEntities } from './providers/entities';
import { provideExpression, type ExpressionSuggestions } from './providers/expressions';
import { dependentRoles, provideMap, provideOptionNames } from './providers/structured';
import { provideEndOfCommand, provideToken } from './providers/tokens';
import { resolve } from './resolve';
import type { SuggestionContext, SuggestionRequest } from './types';

const NOTHING_APPLIES: readonly string[] = ['inside_comment', 'invalid'];

/** The items for an argument that has a role, by the kind of the role alone. */
const provideForRole = async (
  role: ArgumentRole,
  argument: ExpectedArgument,
  resolved: ResolvedRole,
  context: SuggestionContext
): Promise<ISuggestionItem[]> => {
  switch (role.kind) {
    case 'column':
      return provideColumns(role, resolved, context);
    case 'new_name':
      return provideNewName(role, context);
    case 'constant':
      return provideConstant(role, context);
    case 'entity':
      return provideEntities(role, resolved, context);
    case 'option_name':
      return provideOptionNames(role, resolved, context);
    case 'map':
      return provideMap(role, argument, context);
    // The value takes the role its name gives it. A map is offered only inside a map, and
    // the other roles only outside one.
    case 'dependent_value': {
      const isInMap = EXPRESSION_PARTS[argument.id] !== undefined;
      const roles = dependentRoles(role, context).filter(
        (candidate) => (candidate.kind === 'map') === isInMap
      );
      const items = await Promise.all(
        roles.map((candidate) => provideForRole(candidate, argument, resolved, context))
      );

      return items.flat();
    }
    // The providers of the other roles come with the next steps.
    default:
      return [];
  }
};

// The roles whose value can be a string, and so can be offered inside an open one.
const STRING_VALUED: readonly RoleKind[] = ['map', 'constant', 'dependent_value'];

const provideArgument = async (
  { argument, resolved }: Extract<SuggestionRequest, { kind: 'argument' }>,
  context: SuggestionContext
): Promise<ISuggestionItem[]> => {
  // An argument that is already written is offered again only while the cursor is still in it.
  const isBeingTyped = context.ir.position === 'inside_argument' || context.ir.word?.argument;
  if (!resolved || (argument.continues && !isBeingTyped)) {
    return [];
  }
  if (context.ir.position === 'inside_string' && !STRING_VALUED.includes(resolved.role.kind)) {
    return [];
  }

  return provideForRole(resolved.role, argument, resolved, context);
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
    // Expressions are provided first: they decide whether the command can go on.
    case 'expression':
      return [];
  }
};

/** Whether the request is for something of the command itself, outside these expressions. */
const isOutside = (request: SuggestionRequest, entries: string[]): boolean => {
  const path =
    request.kind === 'token'
      ? request.follower.path
      : request.kind === 'argument'
      ? request.argument.path
      : [];

  return !path.some((id) => entries.includes(id));
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

  // Inside a string only a value can be offered: no keyword and no command starts there.
  // An expression has strings of its own, as the query of a search function.
  const requests = resolve(ir).filter(
    ({ kind }) => ir.position !== 'inside_string' || kind === 'argument' || kind === 'expression'
  );
  const context = await createContext(fullText, offset, ir, callbacks);

  const expressions: ExpressionSuggestions[] = await Promise.all(
    requests.flatMap((request) =>
      request.kind === 'expression' ? [provideExpression(request, context)] : []
    )
  );
  // While an expression is unfinished the command cannot go on: only the expression can.
  const unfinished = expressions
    .filter(({ isUnfinished }) => isUnfinished)
    .map(({ entry }) => entry);
  const items = await Promise.all(
    requests
      .filter((request) => !unfinished.length || !isOutside(request, unfinished))
      .map((request) => provide(request, context))
  );

  return present([...expressions.flatMap((expression) => expression.items), ...items.flat()]);
};
