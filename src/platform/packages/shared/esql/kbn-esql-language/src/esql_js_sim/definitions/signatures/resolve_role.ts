/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getGrammarPositions, withoutRecursion } from '../../grammar';
import { ARGUMENT_ROLES, DEFAULT_EXPRESSION_ROLE, DEFAULT_ROLES } from './argument_roles';
import type { ArgumentRole, CallSiteId, ResolvedRole, RoleKind } from './types';

/**
 * The fields a role takes over from a role of the same kind declared above it, when it does
 * not set them itself. FROM's list says its sources may be subqueries; each source in the list
 * is a source in its own right and inherits that.
 */
export const INHERITED_FIELDS: Readonly<Partial<Record<RoleKind, readonly string[]>>> = {
  entity: ['indexMode', 'subqueries'],
  expression: ['subqueries', 'columnsOf', 'fullTextOnlyIn'],
};

/** Two roles describe the same thing, so the inner one refines the outer one. */
const isSameThing = (inner: ArgumentRole, outer: ArgumentRole): boolean =>
  inner.kind === outer.kind &&
  (inner.kind !== 'entity' || outer.kind !== 'entity' || inner.entityType === outer.entityType);

const inherit = (own: ArgumentRole, enclosing: ArgumentRole[]): ArgumentRole => {
  const fields = INHERITED_FIELDS[own.kind] ?? [];
  const merged: Record<string, unknown> = { ...own };

  // The nearest declaration wins, so the roles are read from the inside out.
  for (const outer of [...enclosing].reverse()) {
    if (isSameThing(own, outer)) {
      for (const field of fields) {
        const value = (outer as unknown as Record<string, unknown>)[field];
        if (merged[field] === undefined && value !== undefined) {
          merged[field] = value;
        }
      }
    }
  }

  return merged as unknown as ArgumentRole;
};

let expressionEntries: Set<string> | undefined;

/** Whether the path enters an expression, read from the table of positions. */
const entersExpression = (path: CallSiteId[]): boolean => {
  if (!expressionEntries) {
    expressionEntries = new Set(
      getGrammarPositions()
        .filter(({ kind }) => kind === 'expression')
        .map(({ id }) => id)
    );
  }

  const entries = expressionEntries;

  return path.some((id) => entries.has(id));
};

/**
 * The role that applies at a place of the grammar.
 *
 * @param path The call sites from the command down to the place, as `locate` and the table of
 * positions give them.
 * @param rule The rule the place takes, used when no signature covers the place.
 *
 * The innermost role declared on the path applies, refined by what it inherits from the roles
 * above it. Without a declared role the place gets the default for an expression or for its
 * rule, if there is one.
 */
export const resolveRole = (path: CallSiteId[], rule?: string): ResolvedRole | undefined => {
  const declared = withoutRecursion(path).flatMap((id) =>
    ARGUMENT_ROLES[id] ? [{ id, role: ARGUMENT_ROLES[id] }] : []
  );
  const own = declared.at(-1);

  if (own) {
    const enclosing = declared.slice(0, -1);

    return {
      role: inherit(
        own.role,
        enclosing.map(({ role }) => role)
      ),
      id: own.id,
      source: 'signature',
      enclosing,
    };
  }

  const fallback = entersExpression(path)
    ? DEFAULT_EXPRESSION_ROLE
    : rule !== undefined
    ? DEFAULT_ROLES[rule]
    : undefined;

  return fallback && { role: fallback, source: 'default', enclosing: [] };
};
