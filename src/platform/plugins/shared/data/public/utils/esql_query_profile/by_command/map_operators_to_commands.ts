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
import { hasSurrogatePairs } from './query_commands';

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
  /**
   * Short names of the operators that took time that could not be matched to a command, slowest
   * first. An operator can also be on a command, as each instance of it is matched on its own.
   */
  unattributedOperators: string[];
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

/** The index that is the given number of characters on from an index. A character can be two units. */
const advance = (query: string, from: number, characters: number): number => {
  let index = from;
  for (let count = 0; count < characters && index < query.length; count++) {
    index += (query.codePointAt(index) ?? 0) > 0xffff ? 2 : 1;
  }
  return index;
};

/**
 * Where a position of the profile is in the query, as an index into the query string. The position
 * is only believed when the text ES reports for it is what the query has there.
 */
const offsetOf = (
  query: string,
  lineStarts: number[],
  hasSurrogates: boolean,
  { line, column, text }: PlanNodeSource
): number | undefined => {
  const lineStart = lineStarts[line - 1];
  if (lineStart === undefined) {
    return undefined;
  }
  // Elasticsearch counts the column in characters, so an emoji before the command is one.
  const offset = hasSurrogates ? advance(query, lineStart, column - 1) : lineStart + column - 1;
  return query.startsWith(text, offset) ? offset : undefined;
};

/**
 * The commands of a query, with the commands of the subqueries of each command listed just before
 * the command that holds them. Subqueries are numbered in the order their first row is listed, so
 * a subquery inside another can come first, and the numbers read from the top as the work runs.
 */
const listEntries = (commands: QueryCommand[]): Entry[] => {
  let nextSubquery = 0;
  const list = (inCommands: QueryCommand[], subquery?: number): Entry[] =>
    inCommands.flatMap((command): Entry[] => [
      ...(command.branches ?? []).flatMap((branch) => list(branch, nextSubquery++)),
      { command, subquery },
    ]);
  const entries = list(commands);

  const numberOfSubquery = new Map<number, number>();
  entries.forEach(({ subquery }) => {
    if (subquery !== undefined && !numberOfSubquery.has(subquery)) {
      numberOfSubquery.set(subquery, numberOfSubquery.size);
    }
  });
  return entries.map(({ command, subquery }) => ({
    command,
    subquery: subquery === undefined ? undefined : numberOfSubquery.get(subquery),
  }));
};

/** The names of a map of operator time, the slowest first. */
const slowestFirst = (nanosByOperator: Map<string, number>): string[] =>
  [...nanosByOperator.entries()].sort((left, right) => right[1] - left[1]).map(([title]) => title);

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
  const hasSurrogates = hasSurrogatePairs(query);
  // Operators of many drivers share their plan nodes, so each node is placed once.
  const commandOfNode = new Map<string, CommandAccumulator | undefined>();
  const commandOf = (key: string): CommandAccumulator | undefined => {
    if (!commandOfNode.has(key)) {
      const source = planNodeSources[key];
      const offset = source && offsetOf(query, lineStarts, hasSurrogates, source);
      commandOfNode.set(key, offset === undefined ? undefined : commandAt(accumulators, offset));
    }
    return commandOfNode.get(key);
  };
  let unattributedNanos = 0;
  const unattributedByOperator = new Map<string, number>();
  let totalNanos = 0;

  operators.forEach(({ title, drivers }) => {
    // An operator that reports no time still belongs to its command, with no time to add.
    drivers.forEach(({ nodeName, planNodeId, processNanos }) => {
      totalNanos += processNanos;
      const target =
        planNodeId === undefined ? undefined : commandOf(planNodeKey(nodeName, planNodeId));
      if (!target) {
        unattributedNanos += processNanos;
        if (processNanos > 0) {
          unattributedByOperator.set(
            title,
            (unattributedByOperator.get(title) ?? 0) + processNanos
          );
        }
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
    operators: slowestFirst(operatorNanos),
  }));

  return {
    // A command that only holds subqueries is worth a row when it took time of its own. Any other
    // stays, such as FROM a, (...) with a source, or WHERE k IN (...) with an expression.
    commands: heats.filter(({ command, share }) => !command.holdsOnlySubqueries || share > 0),
    unattributedShare: shareOf(unattributedNanos, totalNanos),
    unattributedOperators: slowestFirst(unattributedByOperator),
    hasSubqueries: commands.some((command) => Boolean(command.branches?.length)),
  };
}
