/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isBinaryExpression, isIdentifier, isSource, isSubQuery, Walker } from '@elastic/esql';
import type {
  ESQLAstAllCommands,
  ESQLAstHeaderCommand,
  ESQLAstLetHeaderCommand,
  ESQLAstQueryExpression,
  ESQLCommand,
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
  if (source.sourceType !== 'index' || source.prefix || source.selector) {
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

/** Returns the named subqueries referenced by the commands, directly or through other named subqueries. */
export const getUsedNamedSubqueries = (
  commands: ESQLAstAllCommands[],
  namedSubqueries: readonly NamedSubquery[]
): ReadonlySet<NamedSubquery> => {
  const usedNamedSubqueries = new Set(getReferencedNamedSubqueries(commands, namedSubqueries));

  for (let index = namedSubqueries.length - 1; index >= 0; index--) {
    const namedSubquery = namedSubqueries[index];

    if (!usedNamedSubqueries.has(namedSubquery)) {
      continue;
    }

    const dependencies = getReferencedNamedSubqueries(
      namedSubquery.query.commands,
      getNamedSubqueriesAvailableTo(namedSubqueries, namedSubquery)
    );

    for (const dependency of dependencies) {
      usedNamedSubqueries.add(dependency);
    }
  }

  return usedNamedSubqueries;
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

const getReferencedNamedSubqueries = (
  commands: ESQLAstAllCommands[],
  namedSubqueries: readonly NamedSubquery[]
) => {
  const fromCommands = Walker.matchAll(commands, {
    type: 'command',
    // Only FROM can read a LET; TS and JOIN targets must not mark it as used.
    name: 'from',
  }) as Array<ESQLCommand<'from'>>;
  const sources = fromCommands.flatMap(({ args }) => args.filter(isSource));

  return sources.flatMap((source) => findNamedSubqueryForSource(source, namedSubqueries) ?? []);
};
