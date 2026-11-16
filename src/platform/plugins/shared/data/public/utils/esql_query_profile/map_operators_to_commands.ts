/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { commandNames, sourceCommandNames } from '@elastic/esql-definitions';
import type { AggregatedOperator } from './query_profile_model';
import { shareOf } from './aggregate_esql_profile';
import type { QueryCommand } from './query_commands';

export interface CommandHeat {
  command: QueryCommand;
  /**
   * Which subquery the command is in, counting from 0 in the order they are written. Undefined for
   * a command of the main query.
   */
  subquery?: number;
  /** Share of all operator CPU time, counting shared time. From 0 to 1. */
  share: number;
  /** True when part of the time is shared, so the share is an upper bound. */
  isApproximate: boolean;
  /** Short names of the operators attributed here, slowest first. */
  operators: string[];
}

export interface QueryHeat {
  /** The commands in the order they are written, with those of subqueries in place. */
  commands: CommandHeat[];
  /** Share of the operator CPU time that no command explains, such as exchanges. From 0 to 1. */
  unattributedShare: number;
  /** True when the query has subqueries, so the commands belong to different queries. */
  hasSubqueries: boolean;
}

const normalize = (name: string): string => name.toLowerCase().replace(/[^a-z]/g, '');

/** Whether an operator reads the data, which is what the first command of a query does. */
const isSourceOperator = (title: string): boolean => {
  const name = normalize(title);
  return name.includes('lucene') || name.includes('reader') || name.includes('source');
};

/** The command names an operator can stand for, from most to least specific. */
/** The commands whose name contains one of these, such as STATS and INLINE STATS for `stats`. */
const commandsNamedLike = (...parts: string[]): string[] =>
  commandNames.filter((command) => parts.some((part) => normalize(command).includes(part)));

function candidateCommandNames(title: string): string[] {
  const name = normalize(title);

  if (name.includes('exchange') || name === 'output') {
    return [];
  }
  if (isSourceOperator(title)) {
    return [...sourceCommandNames];
  }
  if (name.includes('filter')) {
    return ['WHERE'];
  }
  if (name.includes('aggregation') || name.includes('stats')) {
    return commandsNamedLike('stats');
  }
  if (name.includes('topn')) {
    return ['SORT', 'LIMIT'];
  }
  if (name.includes('limit')) {
    return ['LIMIT'];
  }
  if (name.includes('project')) {
    return ['KEEP', 'DROP', 'RENAME'];
  }
  if (name.includes('eval')) {
    return ['EVAL'];
  }
  // A LOOKUP JOIN runs as a StreamingLookupOperator. Enrich has its own operators.
  if (name.includes('join') || (name.includes('lookup') && !name.includes('enrich'))) {
    return commandsNamedLike('join', 'lookup');
  }
  // Other operators are named after their command, such as Enrich, Dissect, Grok or MvExpand.
  return commandNames.filter((command) => normalize(command) === name);
}

type Scope = { kind: 'flat' } | { kind: 'main' } | { kind: 'subquery'; index: number };

interface Entry {
  command: QueryCommand;
  subquery?: number;
}

/**
 * Tells which query each driver belongs to. ES names the final driver of a subquery after it, such
 * as subplan-0.final, and lists the data drivers of a subquery just before it. Without those names
 * there is no telling the queries apart, and every command is a candidate for every operator.
 */
function driverScopes(
  descriptions: Map<number, string>,
  hasSubqueries: boolean
): (driverIndex: number) => Scope {
  const isLabeled = [...descriptions.values()].some((description) =>
    description.startsWith('subplan-')
  );
  if (!hasSubqueries || !isLabeled) {
    return () => ({ kind: 'flat' });
  }

  const ordered = [...descriptions.keys()].sort((left, right) => left - right);
  const scopeOf = (driverIndex: number): Scope => {
    const description = descriptions.get(driverIndex) ?? '';
    const subplan = /^subplan-(\d+)/.exec(description);
    if (subplan) {
      return { kind: 'subquery', index: Number(subplan[1]) };
    }
    if (description === 'data') {
      const next = ordered.find(
        (index) => index > driverIndex && descriptions.get(index) !== 'data'
      );
      return next === undefined ? { kind: 'main' } : scopeOf(next);
    }
    return { kind: 'main' };
  };
  return scopeOf;
}

/** Whether a command is in the query that a driver belongs to. */
const isInScope = (entry: Entry, scope: Scope): boolean =>
  scope.kind === 'flat' ||
  (scope.kind === 'main' && entry.subquery === undefined) ||
  (scope.kind === 'subquery' && entry.subquery === scope.index);

/** Whether an operator that can stand for these command names can stand for this command. */
const standsFor = (candidates: string[], command: QueryCommand): boolean =>
  candidates.includes(command.name) || candidates.includes(normalize(command.name).toUpperCase());

/** The CPU time found for one command, while the operators are being attributed. */
interface CommandAccumulator {
  entry: Entry;
  exactNanos: number;
  sharedNanos: number;
  /** CPU time by short operator name. */
  operatorNanos: Map<string, number>;
}

/**
 * Attributes operator CPU time to the commands of a query. The planner pushes filters into the
 * search, splits aggregations and adds its own steps, so this is a best effort: operators that
 * could stand for several commands count as shared, and operators that fit none are left out.
 * The commands of subqueries get the operators of the drivers that belong to their subquery.
 */
export function mapOperatorsToCommands(
  commands: QueryCommand[],
  operators: AggregatedOperator[]
): QueryHeat {
  const owner = commands.find((command) => command.branches && command.branches.length > 0);
  const entries: Entry[] = commands.flatMap((command) =>
    command === owner
      ? (command.branches ?? []).flatMap((branch, index) =>
          branch.map((inner) => ({ command: inner, subquery: index }))
        )
      : [{ command }]
  );
  const accumulators: CommandAccumulator[] = entries.map((entry) => ({
    entry,
    exactNanos: 0,
    sharedNanos: 0,
    operatorNanos: new Map(),
  }));
  let unattributedNanos = 0;

  const instances = operators
    .filter((operator) => operator.timeReported)
    .flatMap((operator) =>
      operator.drivers
        .filter((driver) => driver.timeReported)
        .map((driver) => ({
          title: operator.title,
          nanos: driver.processNanos,
          driverIndex: driver.driverIndex,
          description: driver.description,
        }))
    );
  const total = instances.reduce((sum, instance) => sum + instance.nanos, 0);
  const scopeOf = driverScopes(
    new Map(instances.map((instance) => [instance.driverIndex, instance.description])),
    owner !== undefined
  );

  instances.forEach((instance) => {
    const scope = scopeOf(instance.driverIndex);
    const candidates = candidateCommandNames(instance.title);
    const matching = accumulators.filter(
      ({ entry }) => isInScope(entry, scope) && standsFor(candidates, entry.command)
    );

    if (matching.length === 0) {
      unattributedNanos += instance.nanos;
      return;
    }
    // A source operator belongs to the first command of its query, which is the one that reads data.
    const targets = isSourceOperator(instance.title) ? [matching[0]] : matching;
    const isShared = targets.length > 1;
    targets.forEach((target) => {
      if (isShared) {
        target.sharedNanos += instance.nanos;
      } else {
        target.exactNanos += instance.nanos;
      }
      target.operatorNanos.set(
        instance.title,
        (target.operatorNanos.get(instance.title) ?? 0) + instance.nanos
      );
    });
  });

  return {
    commands: accumulators.map(({ entry, exactNanos, sharedNanos, operatorNanos }) => ({
      command: entry.command,
      subquery: entry.subquery,
      share: shareOf(exactNanos + sharedNanos, total),
      isApproximate: sharedNanos > 0,
      operators: [...operatorNanos.entries()]
        .sort((left, right) => right[1] - left[1])
        .map(([title]) => title),
    })),
    unattributedShare: shareOf(unattributedNanos, total),
    hasSubqueries: owner !== undefined,
  };
}
