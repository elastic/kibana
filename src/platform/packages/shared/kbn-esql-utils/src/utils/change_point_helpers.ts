/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import {
  Walker,
  Parser,
  WrappingPrettyPrinter,
  BasicPrettyPrinter,
  isColumn,
  isBinaryExpression,
  isLiteral,
  isStringLiteral,
  isAssignment,
} from '@elastic/esql';
import { CommandNames, esqlCommandRegistry } from '@kbn/esql-language';
import type {
  ESQLAstItem,
  ESQLAstForkCommand,
  ESQLAstChangePointCommand,
  ESQLAstQueryExpression,
  ESQLAstCommand,
  ESQLForkParens,
  ESQLIntegerLiteral,
  ESQLDecimalLiteral,
} from '@elastic/esql/types';

/**
 * Returns true if the ES|QL query contains a CHANGE_POINT command.
 * @param esql - The ES|QL query string
 */
export const hasChangePointCommand = (esql?: string): boolean => {
  if (!esql) return false;
  try {
    const { root } = Parser.parse(esql);
    return root.commands.some((cmd) => cmd.name === CommandNames.CHANGE_POINT);
  } catch {
    return false;
  }
};

/**
 * Output column names for the CHANGE_POINT command (type and pvalue).
 * Defaults are 'type' and 'pvalue' unless the query uses AS type_name, pvalue_name.
 * @param esql - The ES|QL query string
 * @returns Object with typeColumn and pvalueColumn names, or undefined if no CHANGE_POINT command
 */
export const getChangePointOutputColumnNames = (
  esql?: string
): { typeColumn: string; pvalueColumn: string } | undefined => {
  if (!esql) return undefined;
  try {
    const { root } = Parser.parse(esql);
    const changePointCommands = Walker.findAll(
      root,
      (node) => node.type === 'command' && node.name === CommandNames.CHANGE_POINT
    );
    const cp = changePointCommands.at(0) as ESQLAstChangePointCommand | undefined;
    if (!cp) return undefined;
    return {
      typeColumn: cp.target?.type?.parts?.join('.') ?? 'type',
      pvalueColumn: cp.target?.pvalue?.parts?.join('.') ?? 'pvalue',
    };
  } catch {
    return undefined;
  }
};

/**
 * Metric (value) and time column names from the first CHANGE_POINT in the query (same rule as
 * {@link getChangePointOutputColumnNames}). FORK queries should use parallel naming across branches.
 */
export const getChangePointSeriesColumns = (
  esql?: string
): { valueColumn: string; timeColumn: string } | undefined => {
  if (!esql) return undefined;
  try {
    const { root } = Parser.parse(esql);
    const changePointCommands = Walker.findAll(
      root,
      (node) => node.type === 'command' && node.name === CommandNames.CHANGE_POINT
    );
    const cp = changePointCommands.at(0) as ESQLAstChangePointCommand | undefined;
    if (!cp?.value?.parts?.length) return undefined;
    const valueColumn = cp.value.parts.join('.');
    const timeColumn = cp.key?.parts?.length ? cp.key.parts.join('.') : '@timestamp';
    return { valueColumn, timeColumn };
  } catch {
    return undefined;
  }
};

const literalNodeToComparable = (node: ESQLAstItem): unknown => {
  if (!isLiteral(node)) return undefined;
  if (isStringLiteral(node)) return node.valueUnquoted ?? node.value;
  if (node.literalType === 'integer' || node.literalType === 'double') {
    // ESQLLiteral is a discriminated union but TS cannot narrow it via string-literal type
    // properties in the same way as a tagged union — this cast is unavoidable.
    return (node as ESQLIntegerLiteral | ESQLDecimalLiteral).value;
  }
  if (node.literalType === 'boolean') {
    return node.value === 'true';
  }
  if (node.literalType === 'null') {
    return null;
  }
  return undefined;
};

const collectEqualitiesFromWhereExpression = (
  expr: ESQLAstItem | undefined,
  columnIds: ReadonlySet<string>,
  out: Map<string, unknown>
): void => {
  if (!expr) return;
  if (isBinaryExpression(expr)) {
    if (expr.name === 'and') {
      collectEqualitiesFromWhereExpression(expr.args[0], columnIds, out);
      collectEqualitiesFromWhereExpression(expr.args[1], columnIds, out);
      return;
    }
    if (expr.name === '==') {
      const [a, b] = expr.args;
      const colSide = isColumn(a) ? a : isColumn(b) ? b : undefined;
      const otherSide = isColumn(a) ? b : isColumn(b) ? a : undefined;
      if (!colSide || otherSide === undefined) return;
      const colId = colSide.parts.join('.');
      if (!columnIds.has(colId)) return;
      const lit = literalNodeToComparable(otherSide);
      if (lit !== undefined || (isLiteral(otherSide) && otherSide.literalType === 'null')) {
        out.set(colId, lit ?? null);
      }
    }
  }
};

const collectConstrainedColumnValues = (
  esql: string,
  columnIds: ReadonlySet<string>
): Map<string, unknown> => {
  const out = new Map<string, unknown>();
  try {
    const { root } = Parser.parse(esql);
    for (const cmd of root.commands as ESQLAstCommand[]) {
      if (cmd.name === 'where') {
        collectEqualitiesFromWhereExpression(
          cmd.args[0] as ESQLAstItem | undefined,
          columnIds,
          out
        );
      }
      if (cmd.name === 'eval') {
        for (const arg of cmd.args) {
          const items: ESQLAstItem[] = Array.isArray(arg) ? arg : [arg];
          for (const item of items) {
            if (!isAssignment(item)) continue;
            const lhs = item.args[0];
            const rhsRaw = item.args[1];
            const rhs: ESQLAstItem | undefined = Array.isArray(rhsRaw) ? rhsRaw[0] : rhsRaw;
            if (!isColumn(lhs) || rhs === undefined) continue;
            const colId = lhs.parts.join('.');
            if (!columnIds.has(colId)) continue;
            const lit = literalNodeToComparable(rhs);
            if (lit !== undefined || (isLiteral(rhs) && rhs.literalType === 'null')) {
              out.set(colId, lit ?? null);
            }
          }
        }
      }
    }
  } catch {
    return new Map();
  }
  return out;
};

const literalMatchesValue = (cell: unknown, literalValue: unknown): boolean => {
  if (literalValue === null) {
    return cell === null || cell === undefined;
  }
  if (cell === null || cell === undefined) return false;
  if (typeof literalValue === 'number' && Number.isFinite(literalValue)) {
    if (typeof cell === 'number' && Number.isFinite(cell)) return cell === literalValue;
    if (typeof cell === 'string') {
      const n = Number(cell);
      return cell.length > 0 && !Number.isNaN(n) && n === literalValue;
    }
    return false;
  }
  if (typeof literalValue === 'boolean') {
    if (typeof cell === 'boolean') return cell === literalValue;
    if (typeof cell === 'string') {
      const s = cell.toLowerCase();
      return (literalValue && s === 'true') || (!literalValue && s === 'false');
    }
    return false;
  }
  return String(cell) === String(literalValue);
};

export const formatEsqlIdentifier = (columnId: string): string => {
  if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(columnId)) {
    return columnId;
  }
  return `\`${columnId.replace(/`/g, '``')}\``;
};

export const formatEsqlLiteral = (value: unknown): string | undefined => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === 'bigint') {
    return String(value);
  }
  if (typeof value === 'string') {
    return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `"${value.toISOString()}"`;
  }
  return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
};

/**
 * Narrows the line-chart ES|QL to entity rows by appending {@code | WHERE} only for columns that are
 * not already constrained to the same values via {@code WHERE} or literal {@code EVAL} assignments
 * earlier in the pipeline.
 */
export const appendEntityFiltersToChangePointLineEsql = (
  lineEsql: string,
  row: Readonly<Record<string, unknown>>,
  entityColumnIds: readonly string[]
): string => {
  if (!entityColumnIds.length) return lineEsql;

  const constrained = collectConstrainedColumnValues(lineEsql, new Set(entityColumnIds));

  const predicates = entityColumnIds.reduce<string[]>((acc, col) => {
    const lit = formatEsqlLiteral(row[col]);
    if (lit === undefined) return acc;
    if (constrained.has(col) && literalMatchesValue(row[col], constrained.get(col))) return acc;
    acc.push(`${formatEsqlIdentifier(col)} == ${lit}`);
    return acc;
  }, []);

  return predicates.length ? `${lineEsql} | WHERE ${predicates.join(' AND ')}` : lineEsql;
};

const stripTrailingSortCommands = <T extends { name?: string }>(commands: T[]): T[] => {
  const next = [...commands];
  while (next.length > 0 && next[next.length - 1]?.name === 'sort') {
    next.pop();
  }
  return next;
};

const normalizePrintedEsql = (printed: string): string =>
  printed
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join(' ');

export interface BuildChangePointLineDataQueryOptions {
  /** Zero-based FORK branch index when the pipeline uses FORK. Defaults to 0. */
  forkBranchIndex?: number;
}

/**
 * Builds the ES|QL used as the Lens line-chart dataset: pipeline before CHANGE_POINT (trailing SORT
 * removed).
 *
 * **FORK:** Concatenates every command **before** the FORK (e.g. `FROM`, `EVAL`, …) with the
 * chosen branch's commands **before** `CHANGE_POINT`. Omits the FORK wrapper and any commands after
 * it (e.g. a trailing `WHERE` on change-point output). Using only `FROM` + branch was wrong for
 * non-first branches when pre-FORK commands exist, and dropped post-`FROM` preprocessing.
 */
export const buildChangePointLineDataQuery = (
  esql?: string,
  options?: BuildChangePointLineDataQueryOptions
): string | undefined => {
  if (!esql) return undefined;
  try {
    const { root } = Parser.parse(esql);
    const forkIndex = root.commands.findIndex((c) => c.name === 'fork');

    if (forkIndex >= 0) {
      const forkCmd = root.commands[forkIndex] as ESQLAstForkCommand;
      const forkArgs = forkCmd.args as ESQLForkParens[] | undefined;
      if (!forkArgs?.length) return undefined;

      const branchIndex = Math.min(Math.max(options?.forkBranchIndex ?? 0, 0), forkArgs.length - 1);
      const branchParen = forkArgs[branchIndex];
      const branchQuery = branchParen.child as ESQLAstQueryExpression;
      if (branchQuery?.type !== 'query' || !branchQuery.commands) return undefined;

      const cpIdx = branchQuery.commands.findIndex((c) => c.name === CommandNames.CHANGE_POINT);
      if (cpIdx < 0) return undefined;

      const prefixBeforeFork = root.commands.slice(0, forkIndex) as ESQLAstCommand[];
      if (
        !prefixBeforeFork.some((c) => esqlCommandRegistry.getSourceCommandNames().includes(c.name))
      ) {
        return undefined;
      }

      const branchBeforeChangePoint = stripTrailingSortCommands(
        branchQuery.commands.slice(0, cpIdx) as ESQLAstCommand[]
      );

      const synthetic: ESQLAstQueryExpression = {
        ...root,
        commands: [...prefixBeforeFork, ...branchBeforeChangePoint],
      };
      return normalizePrintedEsql(BasicPrettyPrinter.print(synthetic));
    }

    const cpIdx = root.commands.findIndex((c) => c.name === CommandNames.CHANGE_POINT);
    if (cpIdx < 0) return undefined;
    const prefix = stripTrailingSortCommands(root.commands.slice(0, cpIdx) as ESQLAstCommand[]);
    const synthetic: ESQLAstQueryExpression = { ...root, commands: prefix };
    return normalizePrintedEsql(WrappingPrettyPrinter.print(synthetic));
  } catch {
    return undefined;
  }
};
