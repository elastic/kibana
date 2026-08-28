/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  esql,
  Parser,
  BasicPrettyPrinter,
  Builder,
  isOptionNode,
  isFunctionExpression,
  isAssignment,
  isColumn,
  isParens,
  isQuery,
} from '@elastic/esql';
import type { ESQLCommand, ESQLCommandOption } from '@elastic/esql/types';
import { AUTO_TARGET_NUMBER_OF_BUCKETS } from './constants';

/**
 * Builds the BUCKET expression used for trendline time bucketing.
 *
 * Uses `AUTO_TARGET_NUMBER_OF_BUCKETS` (75) to match the bucket width that
 * Lens's form-based `auto` date_histogram produces when converting to ES|QL.
 *
 * Uses `esql.col()` to properly escape field names that contain special
 * characters (e.g. `order.date` → `` `order.date` ``).
 *
 * ES|QL uses the expression as written in the query as the result column name,
 * preserving `?_tstart` and `?_tend` literally (they are not substituted into
 * the column name). This means the column name is already stable across time
 * range changes without needing an alias.
 */
export const buildTrendlineBucketExpression = (timeField: string): string =>
  `BUCKET(${esql.col(timeField)}, ${AUTO_TARGET_NUMBER_OF_BUCKETS}, ?_tstart, ?_tend)`;

/**
 * Parses a BUCKET expression into an AST node by extracting it from a helper query.
 */
const parseBucketNode = (bucketExpr: string) => {
  const { root } = Parser.parse(`FROM _x | STATS _x BY ${bucketExpr}`);
  const statsCmd = findStatsCommand(root.commands);
  const byOption = findByOption(statsCmd);
  return byOption.args[0];
};

/** Finds the STATS command in a list of AST commands. */
const findStatsCommand = (commands: ESQLCommand[]): ESQLCommand => {
  const cmd = commands.find((c): c is ESQLCommand<'stats'> => c.name === 'stats');
  if (!cmd) throw new Error('Expected STATS command in parsed AST');
  return cmd;
};

/** Finds the BY option within a STATS command's args. */
const findByOption = (statsCmd: ESQLCommand): ESQLCommandOption => {
  const option = statsCmd.args.find(isOptionNode);
  if (!option) throw new Error('Expected BY option in STATS command');
  return option;
};

/** Returns the command lists of each FORK branch (subqueries in parens). */
const getForkBranches = (forkCommand: ESQLCommand): ESQLCommand[][] =>
  forkCommand.args
    .filter(isParens)
    .map((paren) =>
      isQuery(paren.child)
        ? paren.child.commands.filter((c): c is ESQLCommand => c.type === 'command')
        : []
    );

const commandsHaveStats = (commands: ESQLCommand[]): boolean =>
  commands.some(
    (command) =>
      command.name === 'stats' ||
      (command.name === 'fork' && getForkBranches(command).some(commandsHaveStats))
  );

/**
 * Returns true when the ES|QL query contains at least one STATS command,
 * including STATS commands nested inside FORK branches.
 */
export const queryHasStatsCommand = (esqlQuery: string): boolean => {
  const { root } = Parser.parse(esqlQuery);
  return commandsHaveStats(root.commands);
};

/** Returns the result column names produced by a STATS command's aggregations. */
const getStatsResultColumns = (statsCommand: ESQLCommand): string[] => {
  const columns: string[] = [];
  for (const arg of statsCommand.args) {
    if (Array.isArray(arg) || isOptionNode(arg)) continue;
    if (isAssignment(arg) && isColumn(arg.args[0])) {
      columns.push(arg.args[0].name);
    } else if (isFunctionExpression(arg) || isColumn(arg)) {
      columns.push(BasicPrettyPrinter.expression(arg));
    }
  }
  return columns;
};

/**
 * Selects the FORK branch to derive the trendline from: the first branch whose
 * STATS produces one of the requested metric columns, otherwise the first
 * branch containing a STATS command, otherwise the first branch.
 */
const selectForkBranch = (
  branches: ESQLCommand[][],
  metricFields?: string[]
): ESQLCommand[] | undefined => {
  if (metricFields && metricFields.length > 0) {
    const match = branches.find((branch) =>
      branch.some(
        (command) =>
          command.name === 'stats' &&
          getStatsResultColumns(command).some((column) => metricFields.includes(column))
      )
    );
    if (match) return match;
  }
  return branches.find((branch) => branch.some((c) => c.name === 'stats')) ?? branches[0];
};

/**
 * Replaces a top-level FORK command with the commands of a single selected
 * branch so the trendline rewrite operates on source columns that are in
 * scope. After FORK, only branch output columns (plus the synthetic `_fork`
 * discriminator) are available, so time bucketing cannot be appended to the
 * whole query; instead the branch that produces the metric column is inlined.
 *
 * Mutates `commands` in place. References to the synthetic `_fork` column in
 * later KEEP/DROP commands are removed since the column no longer exists.
 */
const flattenForkCommands = (commands: ESQLCommand[], metricFields?: string[]): void => {
  const forkIndex = commands.findIndex((command) => command.name === 'fork');
  if (forkIndex === -1) return;

  const branch = selectForkBranch(getForkBranches(commands[forkIndex]), metricFields) ?? [];
  commands.splice(forkIndex, 1, ...branch);

  for (let i = commands.length - 1; i >= forkIndex + branch.length; i--) {
    const command = commands[i];
    if (command.name !== 'keep' && command.name !== 'drop') continue;
    command.args = command.args.filter((arg) => !(isColumn(arg) && arg.name === '_fork'));
    if (command.args.length === 0) {
      commands.splice(i, 1);
    }
  }
};

/** Returns true when the ES|QL query uses the TS source command. */
export const queryHasTsSourceCommand = (esqlQuery: string): boolean => {
  const { root } = Parser.parse(esqlQuery);
  return root.commands.some((command) => command.name === 'ts');
};

const findFirstStatsAfterTs = (commands: ESQLCommand[]): ESQLCommand<'stats'> | undefined => {
  const tsIndex = commands.findIndex((command) => command.name === 'ts');
  if (tsIndex === -1) return;
  return commands
    .slice(tsIndex + 1)
    .find((command): command is ESQLCommand<'stats'> => command.name === 'stats');
};

/** Finds the first STATS command whose BY clause contains a TBUCKET grouping. */
const findStatsWithTbucket = (commands: ESQLCommand[]): ESQLCommand<'stats'> | undefined =>
  commands.find(
    (command): command is ESQLCommand<'stats'> =>
      command.name === 'stats' && getTbucketResultColumn(command) !== undefined
  );

const getTbucketResultColumn = (statsCommand: ESQLCommand): string | undefined => {
  const byOption = statsCommand.args.find(isOptionNode);
  if (!byOption) return;

  for (const expression of byOption.args) {
    if (isFunctionExpression(expression) && expression.name === 'tbucket') {
      return BasicPrettyPrinter.expression(expression);
    }
    if (isAssignment(expression) && isColumn(expression.args[0])) {
      const assignmentValue = Array.isArray(expression.args[1])
        ? expression.args[1][0]
        : expression.args[1];
      if (
        assignmentValue &&
        isFunctionExpression(assignmentValue) &&
        assignmentValue.name === 'tbucket'
      ) {
        return expression.args[0].name;
      }
    }
  }
};

const buildTrendlineTbucketExpression = (): string => `TBUCKET(${AUTO_TARGET_NUMBER_OF_BUCKETS})`;

/**
 * Returns the result column of a BUCKET grouping on the given time field:
 * the alias when assigned, otherwise the printed BUCKET expression.
 */
const getBucketResultColumnForField = (
  statsCommand: ESQLCommand,
  timeField: string
): string | undefined => {
  const byOption = statsCommand.args.find(isOptionNode);
  if (!byOption) return;

  const isBucketOnField = (node: unknown): boolean => {
    if (!node || Array.isArray(node)) return false;
    const expression = node as Parameters<typeof isFunctionExpression>[0];
    if (!isFunctionExpression(expression) || expression.name !== 'bucket') return false;
    const firstArg = expression.args[0];
    return !Array.isArray(firstArg) && isColumn(firstArg) && firstArg.name === timeField;
  };

  for (const expression of byOption.args) {
    if (isBucketOnField(expression) && isFunctionExpression(expression)) {
      return BasicPrettyPrinter.expression(expression);
    }
    if (isAssignment(expression) && isColumn(expression.args[0])) {
      const assignmentValue = Array.isArray(expression.args[1])
        ? expression.args[1][0]
        : expression.args[1];
      if (isBucketOnField(assignmentValue)) {
        return expression.args[0].name;
      }
    }
  }
};

const preserveColumnInKeepCommands = (commands: ESQLCommand[], columnName: string): void => {
  let currentName = columnName;
  for (const command of commands) {
    currentName = applyRenameCommandToColumn(command, currentName);
    if (
      command.name === 'keep' &&
      !command.args.some((arg) => isColumn(arg) && arg.name === currentName)
    ) {
      command.args.push(Builder.expression.column(currentName));
    }
  }
};

/**
 * Applies a single RENAME command to a column name, returning the resulting
 * name. Handles both `RENAME old AS new` and `RENAME new = old` forms.
 */
const applyRenameCommandToColumn = (command: ESQLCommand, columnName: string): string => {
  if (command.name !== 'rename') return columnName;
  let currentName = columnName;
  for (const arg of command.args) {
    if (Array.isArray(arg) || !isFunctionExpression(arg)) continue;
    const [left, right] = arg.args;
    if (Array.isArray(left) || Array.isArray(right) || !isColumn(left) || !isColumn(right)) {
      continue;
    }
    if (arg.name === 'as' && left.name === currentName) {
      currentName = right.name;
    } else if (arg.name === '=' && right.name === currentName) {
      currentName = left.name;
    }
  }
  return currentName;
};

/** Resolves the final column name after all RENAME commands in the list. */
const applyRenamesToColumn = (commands: ESQLCommand[], columnName: string): string =>
  commands.reduce((name, command) => applyRenameCommandToColumn(command, name), columnName);

/**
 * Appends a BUCKET time-bucketing clause to an ES|QL query for trendline use.
 *
 * Uses `@elastic/esql` AST parsing and manipulation for correct handling of
 * complex queries with proper field name escaping (e.g. dotted field names
 * are backtick-quoted).
 *
 * The query is parsed into an AST, the BUCKET expression is appended to the
 * appropriate STATS/BY clause, and the result is printed back to a string.
 *
 * Handles regular source queries as follows:
 * - Query has `STATS ... BY ...` → appends BUCKET to the existing BY clause
 * - Query has `STATS` without `BY` → adds a BY clause with BUCKET
 * - Query has no `STATS` → appends a `STATS <agg> BY BUCKET(...)` command
 *
 * For a TS source, the first STATS command retains an existing TBUCKET or gets
 * a TBUCKET grouping. Later STATS commands operate on tabular results and are
 * not selected as the time-series aggregation.
 *
 * For non-TS sources (e.g. FROM), an existing TBUCKET grouping in any STATS
 * command is preserved as-is; no additional BUCKET is appended.
 *
 * When the query has no STATS and `metricFields` are provided, each field is
 * wrapped in `AVG()` (e.g. `STATS AVG(bytes) BY BUCKET(...)`). When no metric
 * fields are given, it falls back to `STATS COUNT(*) BY BUCKET(...)`.
 *
 * Queries with a top-level FORK are first reduced to the branch that produces
 * the metric columns (see `flattenForkCommands`) before the rewrite applies.
 */
export const appendTimeBucketToEsqlQuery = (
  esqlQuery: string,
  timeField: string,
  metricFields?: string[],
  groupByFields: string[] = []
): string => {
  const bucketExpr = buildTrendlineBucketExpression(timeField);
  const bucketNode = parseBucketNode(bucketExpr);

  const { root } = Parser.parse(esqlQuery);

  if (root.commands.length === 0) {
    throw new Error('Cannot append time bucket to an empty ES|QL query');
  }

  flattenForkCommands(root.commands, metricFields);

  const tsStatsCommand = findFirstStatsAfterTs(root.commands);

  // TBUCKET is also valid with non-TS source commands (e.g. FROM); an existing
  // TBUCKET grouping already time-buckets the results, so no BUCKET may be added.
  if (!tsStatsCommand && findStatsWithTbucket(root.commands)) {
    return BasicPrettyPrinter.print(root);
  }

  if (tsStatsCommand) {
    if (!getTbucketResultColumn(tsStatsCommand)) {
      const tbucketExpression = buildTrendlineTbucketExpression();
      const { root: helperAst } = Parser.parse(`TS _x | STATS _x BY ${tbucketExpression}`);
      const tbucketNode = findByOption(findStatsCommand(helperAst.commands)).args[0];
      const byOption = tsStatsCommand.args.find(isOptionNode);
      if (byOption) {
        byOption.args.push(tbucketNode);
      } else {
        tsStatsCommand.args.push(findByOption(findStatsCommand(helperAst.commands)));
      }
    }
    return BasicPrettyPrinter.print(root);
  }

  const statsCmd = root.commands.findLast((c): c is ESQLCommand<'stats'> => c.name === 'stats');

  if (statsCmd) {
    const byOption = statsCmd.args.find(isOptionNode);

    if (byOption && !getBucketResultColumnForField(statsCmd, timeField)) {
      // STATS ... BY ... → append to existing BY
      byOption.args.push(bucketNode);
    } else if (!byOption) {
      // STATS without BY → extract a typed BY option node from a helper parse
      const { root: byHelper } = Parser.parse(`FROM _x | STATS _x BY ${bucketExpr}`);
      const byNode = findByOption(findStatsCommand(byHelper.commands));
      statsCmd.args.push(byNode);
    }

    // KEEP commands before STATS need the raw time field (input to BUCKET);
    // KEEP commands after STATS only see the BUCKET result column.
    const statsIndex = root.commands.indexOf(statsCmd);
    const timeResultColumn = getBucketResultColumnForField(statsCmd, timeField) ?? bucketExpr;
    preserveColumnInKeepCommands(root.commands.slice(0, statsIndex), timeField);
    preserveColumnInKeepCommands(root.commands.slice(statsIndex + 1), timeResultColumn);
  } else {
    preserveColumnInKeepCommands(root.commands, timeField);
    // No STATS → append full STATS <agg> BY BUCKET(...) command.
    // Use AVG(<field>) for each provided metric field, or COUNT(*) as fallback.
    const statsExprs =
      metricFields && metricFields.length > 0
        ? metricFields.map((f) => `AVG(${esql.col(f)})`).join(', ')
        : 'COUNT(*)';
    const effectiveGroupByFields = groupByFields.filter((field) => field !== timeField);
    const groupByExprs = [...effectiveGroupByFields.map((f) => esql.col(f)), bucketExpr].join(', ');
    const { root: helperAst } = Parser.parse(`FROM _x | STATS ${statsExprs} BY ${groupByExprs}`);
    root.commands.push(findStatsCommand(helperAst.commands));
  }

  return BasicPrettyPrinter.print(root);
};

export interface TrendlineQueryWithMetricFieldMap {
  query: string;
  metricFieldMap: Map<string, string>;
  timeField: string;
}

/**
 * Builds a trendline ES|QL query and returns the generated metric result column names.
 *
 * When the source query has no STATS command, the trendline query adds AVG(<field>)
 * aggregations for the provided metric fields. The returned map keeps Lens column
 * fieldNames aligned with those generated ES|QL result columns.
 */
export const buildTrendlineQueryWithMetricFieldMap = (
  esqlQuery: string,
  timeField: string,
  metricFields: string[] = [],
  groupByFields: string[] = []
): TrendlineQueryWithMetricFieldMap => {
  const { root } = Parser.parse(esqlQuery);
  flattenForkCommands(root.commands, metricFields);
  const flattenedQuery = BasicPrettyPrinter.print(root);

  const sourceQueryHasStats = queryHasStatsCommand(flattenedQuery);
  const metricFieldMap = new Map<string, string>();
  const tbucketStatsCommand = findStatsWithTbucket(root.commands);
  const tsStatsCommand = findFirstStatsAfterTs(root.commands);
  const statsCommand = root.commands.findLast(
    (command): command is ESQLCommand<'stats'> => command.name === 'stats'
  );

  if (!sourceQueryHasStats) {
    metricFields.forEach((field) => metricFieldMap.set(field, `AVG(${esql.col(field)})`));
  }

  return {
    query: appendTimeBucketToEsqlQuery(
      flattenedQuery,
      timeField,
      !sourceQueryHasStats ? metricFields : undefined,
      !sourceQueryHasStats ? groupByFields : undefined
    ),
    metricFieldMap,
    timeField: resolveTimeResultColumn({
      commands: root.commands,
      tsStatsCommand,
      tbucketStatsCommand,
      statsCommand,
      timeField,
    }),
  };
};

/**
 * Resolves the final time result column of the trendline query, tracking the
 * bucket column through RENAME commands after the aggregating STATS command.
 */
const resolveTimeResultColumn = ({
  commands,
  tsStatsCommand,
  tbucketStatsCommand,
  statsCommand,
  timeField,
}: {
  commands: ESQLCommand[];
  tsStatsCommand: ESQLCommand<'stats'> | undefined;
  tbucketStatsCommand: ESQLCommand<'stats'> | undefined;
  statsCommand: ESQLCommand<'stats'> | undefined;
  timeField: string;
}): string => {
  const bucketStatsCommand = tsStatsCommand ?? tbucketStatsCommand ?? statsCommand;
  const bucketColumn = tsStatsCommand
    ? getTbucketResultColumn(tsStatsCommand)
    : (tbucketStatsCommand && getTbucketResultColumn(tbucketStatsCommand)) ??
      (statsCommand && getBucketResultColumnForField(statsCommand, timeField));

  if (bucketColumn && bucketStatsCommand) {
    return applyRenamesToColumn(
      commands.slice(commands.indexOf(bucketStatsCommand) + 1),
      bucketColumn
    );
  }

  return tsStatsCommand
    ? buildTrendlineTbucketExpression()
    : buildTrendlineBucketExpression(timeField);
};
