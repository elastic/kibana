/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isBinaryExpression, isIdentifier, isSource, isSubQuery } from '@elastic/esql';
import type {
  ESQLAstCommand,
  ESQLAstHeaderCommand,
  ESQLAstItem,
  ESQLAstLetHeaderCommand,
  ESQLAstQueryExpression,
  ESQLIdentifier,
  ESQLSource,
} from '@elastic/esql/types';

/** A `LET name = (subquery);` binding of the query header. */
export interface NamedSubquery {
  readonly name: string;
  readonly identifier: ESQLIdentifier;
  readonly query: ESQLAstQueryExpression;
  readonly command: ESQLAstLetHeaderCommand;
}

/** Extracts valid `LET` named subqueries from a query header in declaration order. */
export const getNamedSubqueries = (header: readonly ESQLAstHeaderCommand[] = []): NamedSubquery[] =>
  header
    .filter((command): command is ESQLAstLetHeaderCommand => command.name === 'let')
    .flatMap((command) => toNamedSubquery(command) ?? []);

/** Returns the first `subqueryN` name that none of the named subqueries uses. */
export const getNextNamedSubqueryName = (
  namedSubqueries: readonly NamedSubquery[] = []
): string => {
  const names = new Set(namedSubqueries.map(({ name }) => name));
  let counter = 0;

  while (names.has(`subquery${counter}`)) {
    counter++;
  }

  return `subquery${counter}`;
};

/** Finds the named subquery referenced by an unqualified local `FROM` source. */
export const findNamedSubqueryForSource = (
  source: ESQLSource,
  namedSubqueries: readonly NamedSubquery[]
): NamedSubquery | undefined => {
  if (!canReferenceNamedSubquery(source)) {
    return undefined;
  }

  return namedSubqueries.find(({ name }) => name === source.name);
};

/** Returns the named subqueries that the selected binding is allowed to reference. */
export const getNamedSubqueriesAvailableTo = (
  namedSubqueries: readonly NamedSubquery[],
  selected: NamedSubquery
): readonly NamedSubquery[] => {
  const index = namedSubqueries.indexOf(selected);

  return index < 0 ? [] : namedSubqueries.slice(0, index);
};

/**
 * Returns the index sources of a source command, replacing LET references with the sources of their
 * bodies. With `maxDepth`, only the sources of inline subqueries up to that depth are read; a LET
 * reference doesn't add a level, its body is read at the depth of the reference. Sources with the same
 * name are not deduplicated.
 */
export const resolveNamedSubquerySources = (
  sourceCommand: ESQLAstCommand | undefined,
  namedSubqueries: readonly NamedSubquery[],
  maxDepth?: number
): ESQLSource[] => walkSources(sourceCommand, namedSubqueries, maxDepth).sources;

/**
 * Returns the named subqueries that a source command reads, directly or through other bindings,
 * in declaration order.
 */
export const getReferencedNamedSubqueries = (
  sourceCommand: ESQLAstCommand | undefined,
  namedSubqueries: readonly NamedSubquery[]
): NamedSubquery[] => {
  const { referenced } = walkSources(sourceCommand, namedSubqueries);

  return namedSubqueries.filter((namedSubquery) => referenced.has(namedSubquery));
};

const toNamedSubquery = (command: ESQLAstLetHeaderCommand): NamedSubquery | undefined => {
  const [binding] = command.args;

  if (!isBinaryExpression(binding)) {
    return undefined;
  }

  const [left, right] = binding.args;

  if (!isIdentifier(left) || !isSubQuery(right)) {
    return undefined;
  }

  return { name: left.name, identifier: left, query: right.child, command };
};

// Only an unqualified local index name can be a LET name.
const canReferenceNamedSubquery = (source: ESQLSource): boolean =>
  source.sourceType === 'index' && !source.prefix && !source.selector;

interface PendingArg {
  readonly arg: ESQLAstItem;
  // How many leading bindings the arg can reference: a body sees only the bindings declared before it.
  readonly scope: number;
  // How many inline subqueries the arg is nested in.
  readonly depth: number;
}

// Depth-first with an explicit stack and a name lookup: a LET chain can be as long as the query.
const walkSources = (
  sourceCommand: ESQLAstCommand | undefined,
  namedSubqueries: readonly NamedSubquery[],
  maxDepth?: number
): { sources: ESQLSource[]; referenced: Set<NamedSubquery> } => {
  // The first declaration of a name wins, as with `find`.
  const indexByName = new Map<string, number>();
  namedSubqueries.forEach(({ name }, index) => {
    if (!indexByName.has(name)) {
      indexByName.set(name, index);
    }
  });

  const sources: ESQLSource[] = [];
  const referenced = new Set<NamedSubquery>();
  // The lowest depth each binding was expanded at: deeper expansions read a subset of its sources.
  const expandedAt = new Map<NamedSubquery, number>();
  const pending: PendingArg[] = [];
  // Pushed in reverse, so the args are visited in query order.
  const pushArgs = (command: ESQLAstCommand | undefined, scope: number, depth: number) => {
    const args = command?.args ?? [];
    for (let i = args.length - 1; i >= 0; i--) {
      pending.push({ arg: args[i], scope, depth });
    }
  };

  pushArgs(sourceCommand, namedSubqueries.length, 0);

  for (let next = pending.pop(); next; next = pending.pop()) {
    const { arg, scope, depth } = next;

    if (isSubQuery(arg)) {
      pushArgs(arg.child.commands[0], scope, depth + 1);
      continue;
    }

    if (!isSource(arg) || arg.sourceType !== 'index') {
      continue;
    }

    const index = canReferenceNamedSubquery(arg) ? indexByName.get(arg.name) : undefined;

    if (index === undefined) {
      if (maxDepth === undefined || depth <= maxDepth) {
        sources.push(arg);
      }
      continue;
    }

    const namedSubquery = namedSubqueries[index];
    referenced.add(namedSubquery);

    // Without a depth limit, every depth reads the same sources.
    const level = maxDepth === undefined ? 0 : Math.min(depth, maxDepth + 1);

    // Elasticsearch rejects a binding declared later or itself: keep it, but don't read its sources.
    // Shared dependencies only need to be expanded once per level.
    if (index < scope && level < (expandedAt.get(namedSubquery) ?? Infinity)) {
      expandedAt.set(namedSubquery, level);
      pushArgs(namedSubquery.query.commands[0], index, depth);
    }
  }

  return { sources, referenced };
};
