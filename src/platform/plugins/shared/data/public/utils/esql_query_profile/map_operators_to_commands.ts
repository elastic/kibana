/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AggregatedOperator, PlanNodeSource } from './types';
import { shareOf } from './aggregate_esql_profile';
import { planNodeKey } from './plan_node_sources';
import type { QueryCommand } from './query_commands';

export interface CommandHeat {
  command: QueryCommand;
  /**
   * Which subquery the command is in, counting from 0 in the order they are written. Undefined for
   * a command of the main query.
   */
  subquery?: number;
  /** Share of all operator CPU time, from 0 to 1. */
  share: number;
  /** Short names of the operators attributed here, slowest first. */
  operators: string[];
}

export interface QueryHeat {
  /** The commands in the order they are written, with those of subqueries in place. */
  commands: CommandHeat[];
  /** Share of the operator CPU time that no command explains, such as the final output. From 0 to 1. */
  unattributedShare: number;
  /** True when the query has subqueries, so the commands belong to different queries. */
  hasSubqueries: boolean;
}

interface Entry {
  command: QueryCommand;
  subquery?: number;
}

/**
 * Where a position of the profile is in the query, as an index into the query string. The position
 * is only believed when the text ES reports for it is what the query has there.
 */
const offsetOf = (query: string, { line, column, text }: PlanNodeSource): number | undefined => {
  const lines = query.split('\n');
  if (line < 1 || line > lines.length) {
    return undefined;
  }
  const lineStart = lines
    .slice(0, line - 1)
    .reduce((sum, previous) => sum + previous.length + 1, 0);
  const offset = lineStart + column - 1;
  return query.startsWith(text, offset) ? offset : undefined;
};

/** The innermost command that holds a position, since a FORK or FROM holds its subqueries. */
const commandAt = (entries: Entry[], offset: number): Entry | undefined =>
  entries
    .filter(({ command }) => command.start <= offset && offset < command.end)
    .reduce<Entry | undefined>(
      (innermost, entry) =>
        innermost === undefined || entry.command.start > innermost.command.start
          ? entry
          : innermost,
      undefined
    );

/** The commands of a query, with those of the subqueries of a FROM or FORK listed in its place. */
const listEntries = (commands: QueryCommand[]): { entries: Entry[]; hasSubqueries: boolean } => {
  const owner = commands.find((command) => command.branches && command.branches.length > 0);
  const entries = commands.flatMap((command): Entry[] =>
    command === owner
      ? [
          ...(command.branches ?? []).flatMap((branch, subquery) =>
            branch.map((inner) => ({ command: inner, subquery }))
          ),
          { command },
        ]
      : [{ command }]
  );
  return { entries, hasSubqueries: owner !== undefined };
};

/** The CPU time found for one command, while the operators are being attributed. */
interface CommandAccumulator {
  entry: Entry;
  nanos: number;
  /** CPU time by short operator name. */
  operatorNanos: Map<string, number>;
}

/**
 * Attributes operator CPU time to the commands of a query. Every operator names the plan node it
 * was built from, and every plan node of the query names the command it came from, by its place in
 * the query. Operators with no such place, such as the final output, are left out.
 */
export function mapOperatorsToCommands({
  query,
  commands,
  operators,
  planNodeSources,
}: {
  query: string;
  commands: QueryCommand[];
  operators: AggregatedOperator[];
  planNodeSources: Record<string, PlanNodeSource>;
}): QueryHeat {
  const { entries, hasSubqueries } = listEntries(commands);
  const accumulators: CommandAccumulator[] = entries.map((entry) => ({
    entry,
    nanos: 0,
    operatorNanos: new Map(),
  }));
  let unattributedNanos = 0;
  let totalNanos = 0;

  operators.forEach(({ title, drivers }) => {
    drivers
      .filter((driver) => driver.timeReported)
      .forEach(({ nodeName, planNodeId, processNanos }) => {
        totalNanos += processNanos;
        const source =
          planNodeId === undefined ? undefined : planNodeSources[planNodeKey(nodeName, planNodeId)];
        const offset = source && offsetOf(query, source);
        const entry = offset === undefined ? undefined : commandAt(entries, offset);
        const target = accumulators.find((accumulator) => accumulator.entry === entry);
        if (!target) {
          unattributedNanos += processNanos;
          return;
        }
        target.nanos += processNanos;
        target.operatorNanos.set(title, (target.operatorNanos.get(title) ?? 0) + processNanos);
      });
  });

  const heats = accumulators.map(({ entry, nanos, operatorNanos }) => ({
    command: entry.command,
    subquery: entry.subquery,
    share: shareOf(nanos, totalNanos),
    operators: [...operatorNanos.entries()]
      .sort((left, right) => right[1] - left[1])
      .map(([title]) => title),
  }));

  return {
    // The FROM or FORK that holds subqueries is only worth a row when it did work of its own.
    commands: heats.filter(
      ({ command, operators: names }) => !command.branches?.length || names.length > 0
    ),
    unattributedShare: shareOf(unattributedNanos, totalNanos),
    hasSubqueries,
  };
}
