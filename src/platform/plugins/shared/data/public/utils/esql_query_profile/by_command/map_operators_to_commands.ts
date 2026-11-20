/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AggregatedOperator, PlanNodeSource } from '../profile/types';
import { shareOf } from '../profile/aggregate_esql_profile';
import { planNodeKey } from '../profile/plan_node_sources';
import type { QueryCommand } from './query_commands';

export interface CommandHeat {
  command: QueryCommand;
  /**
   * Which subquery the command is in, counting from 0 in the order they are written. Undefined for
   * a command of the main query.
   */
  subquery?: number;
  /** Share of all operator time, from 0 to 1. */
  share: number;
  /** Short names of the operators attributed here, slowest first. */
  operators: string[];
}

export interface QueryHeat {
  /** The commands in the order they are written, with those of subqueries in place. */
  commands: CommandHeat[];
  /** Share of the operator time that no command explains, such as the final output. From 0 to 1. */
  unattributedShare: number;
  /** True when the query has subqueries, so the commands belong to different queries. */
  hasSubqueries: boolean;
}

interface Entry {
  command: QueryCommand;
  subquery?: number;
}

/** Where each line of a query starts, as an index into the query string. */
const lineStartsOf = (query: string): number[] => {
  const starts = [0];
  for (let index = 0; index < query.length; index++) {
    if (query[index] === '\n') {
      starts.push(index + 1);
    }
  }
  return starts;
};

/**
 * Where a position of the profile is in the query, as an index into the query string. The position
 * is only believed when the text ES reports for it is what the query has there.
 */
const offsetOf = (
  query: string,
  lineStarts: number[],
  { line, column, text }: PlanNodeSource
): number | undefined => {
  const lineStart = lineStarts[line - 1];
  if (lineStart === undefined) {
    return undefined;
  }
  const offset = lineStart + column - 1;
  return query.startsWith(text, offset) ? offset : undefined;
};

/**
 * The commands of a query, with the commands of the subqueries of every FROM or FORK listed just
 * before the command that holds them. Subqueries are counted across the whole query.
 */
const listEntries = (commands: QueryCommand[]): Entry[] => {
  let subquery = 0;
  return commands.flatMap((command): Entry[] => {
    if (!command.branches?.length) {
      return [{ command }];
    }
    const inner = command.branches.flatMap((branch) => {
      const index = subquery++;
      return branch.map((innerCommand) => ({ command: innerCommand, subquery: index }));
    });
    return [...inner, { command }];
  });
};

/** The operator time found for one command, while the operators are being attributed. */
interface CommandAccumulator {
  entry: Entry;
  nanos: number;
  /** Operator time by short operator name. */
  operatorNanos: Map<string, number>;
}

/** The innermost command that holds a position, since a FORK or FROM holds its subqueries. */
const commandAt = (
  accumulators: CommandAccumulator[],
  offset: number
): CommandAccumulator | undefined =>
  accumulators
    .filter(({ entry: { command } }) => command.start <= offset && offset < command.end)
    .reduce<CommandAccumulator | undefined>(
      (innermost, accumulator) =>
        innermost === undefined || accumulator.entry.command.start > innermost.entry.command.start
          ? accumulator
          : innermost,
      undefined
    );

/**
 * Attributes operator time to the commands of a query. Every operator names the plan node it
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
  const accumulators: CommandAccumulator[] = listEntries(commands).map((entry) => ({
    entry,
    nanos: 0,
    operatorNanos: new Map(),
  }));
  const lineStarts = lineStartsOf(query);
  // Operators of many drivers share their plan nodes, so each node is placed once.
  const commandOfNode = new Map<string, CommandAccumulator | undefined>();
  const commandOf = (key: string): CommandAccumulator | undefined => {
    if (!commandOfNode.has(key)) {
      const source = planNodeSources[key];
      const offset = source && offsetOf(query, lineStarts, source);
      commandOfNode.set(key, offset === undefined ? undefined : commandAt(accumulators, offset));
    }
    return commandOfNode.get(key);
  };
  let unattributedNanos = 0;
  let totalNanos = 0;

  operators.forEach(({ title, drivers }) => {
    drivers
      .filter((driver) => driver.timeReported)
      .forEach(({ nodeName, planNodeId, processNanos }) => {
        totalNanos += processNanos;
        const target =
          planNodeId === undefined ? undefined : commandOf(planNodeKey(nodeName, planNodeId));
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
    hasSubqueries: commands.some((command) => Boolean(command.branches?.length)),
  };
}
