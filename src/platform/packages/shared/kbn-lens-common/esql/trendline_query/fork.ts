/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  BasicPrettyPrinter,
  Walker,
  isOptionNode,
  isFunctionExpression,
  isAssignment,
  isColumn,
  isParens,
  isQuery,
} from '@elastic/esql';
import type { ESQLCommand, ESQLProperNode, ESQLSingleAstItem } from '@elastic/esql/types';

/** Synthetic discriminator column added by FORK to its merged output. */
const FORK_DISCRIMINATOR_COLUMN = '_fork';

/** Returns the command lists of each FORK branch (subqueries in parens). */
const getForkBranches = (forkCommand: ESQLCommand): ESQLCommand[][] =>
  forkCommand.args
    .filter(isParens)
    .map((paren) =>
      isQuery(paren.child)
        ? paren.child.commands.filter((c): c is ESQLCommand => c.type === 'command')
        : []
    );

/**
 * Returns true when the command list contains a STATS command, including
 * STATS commands nested inside FORK branches.
 */
export const commandsHaveStats = (commands: ESQLCommand[]): boolean =>
  commands.some(
    (command) =>
      command.name === 'stats' ||
      (command.name === 'fork' && getForkBranches(command).some(commandsHaveStats))
  );

/** Returns the result column name of a STATS aggregation or BY grouping expression. */
const getExpressionResultColumn = (arg: ESQLCommand['args'][number]): string | undefined => {
  if (Array.isArray(arg) || isOptionNode(arg)) return undefined;
  if (isAssignment(arg) && isColumn(arg.args[0])) return arg.args[0].name;
  if (isFunctionExpression(arg) || isColumn(arg)) return BasicPrettyPrinter.expression(arg);
  return undefined;
};

/** Returns the result column names produced by a STATS command's aggregations. */
const getStatsResultColumns = (statsCommand: ESQLCommand): string[] =>
  statsCommand.args
    .map(getExpressionResultColumn)
    .filter((column): column is string => column !== undefined);

/** Returns the output column names of a STATS command: aggregation results plus BY grouping keys. */
const getStatsOutputColumns = (statsCommand: ESQLCommand): string[] => {
  const byColumns = (statsCommand.args.find(isOptionNode)?.args ?? [])
    .map(getExpressionResultColumn)
    .filter((column): column is string => column !== undefined);
  return [...getStatsResultColumns(statsCommand), ...byColumns];
};

/**
 * Returns true when the command list's output scope contains the given column.
 * An open scope (no STATS, or an unmodeled command) conservatively counts the
 * column as available.
 */
export const commandsProduceColumn = (commands: ESQLCommand[], columnName: string): boolean => {
  const scope = computeScope(commands);
  return scope === null || scope.has(columnName);
};

/**
 * Selects the FORK branch to derive the trendline from. Metric fields are
 * checked in priority order (the first entry is the primary metric). For each
 * field, a branch with an enumerable matching output wins; otherwise the first
 * open-scope branch may carry the raw field. This keeps a possible raw-field
 * match from overriding a definite match in a later branch.
 * Fallback: first branch containing a STATS command, then the first branch.
 */
const selectForkBranch = (
  branches: ESQLCommand[][],
  metricFields?: string[]
): ESQLCommand[] | undefined => {
  const branchScopes = branches.map((branch) => ({ branch, scope: computeScope(branch) }));

  for (const field of metricFields ?? []) {
    const definiteMatch = branchScopes.find(({ scope }) => scope?.has(field));
    if (definiteMatch) return definiteMatch.branch;

    const possibleMatch = branchScopes.find(({ scope }) => scope === null);
    if (possibleMatch) return possibleMatch.branch;
  }
  return branches.find((branch) => branch.some((c) => c.name === 'stats')) ?? branches[0];
};

/**
 * Column scope at a point in the pipeline. A Set enumerates the columns known
 * to be available; `null` means the scope is open (source fields without a
 * STATS, or after a command we cannot model) and cannot be enumerated.
 */
type ColumnScope = Set<string> | null;

/** Returns the names of all columns referenced anywhere in the node. */
const collectColumnRefs = (node: ESQLProperNode): string[] => {
  const names: string[] = [];
  Walker.walk(node, {
    visitColumn: (column) => {
      names.push(column.name);
    },
  });
  return names;
};

/**
 * Returns true when every column the node references is available. The
 * synthetic `_fork` discriminator never counts as available after flattening;
 * in an open scope all other references are assumed valid.
 */
const refsAreInScope = (node: ESQLProperNode, scope: ColumnScope): boolean =>
  collectColumnRefs(node).every(
    (name) => name !== FORK_DISCRIMINATOR_COLUMN && (scope === null || scope.has(name))
  );

/**
 * Removes out-of-scope sub-predicates from a WHERE expression. Conjuncts (AND)
 * with out-of-scope references are dropped while the remaining side is kept;
 * any other out-of-scope expression (comparison, OR, NOT, ...) cannot be
 * pruned without changing semantics, so `undefined` is returned to drop it.
 */
const prunePredicate = (
  node: ESQLSingleAstItem,
  scope: ColumnScope
): ESQLSingleAstItem | undefined => {
  if (refsAreInScope(node, scope)) return node;
  if (isFunctionExpression(node) && node.name === 'and') {
    // mutates the AND node in place, consistent with the module's
    // mutate-in-place style (see removeOutOfScopeReferences)
    const [left, right] = node.args;
    const prunedLeft = Array.isArray(left) ? undefined : prunePredicate(left, scope);
    const prunedRight = Array.isArray(right) ? undefined : prunePredicate(right, scope);
    if (prunedLeft && prunedRight) {
      node.args = [prunedLeft, prunedRight];
      return node;
    }
    return prunedLeft ?? prunedRight;
  }
  return undefined;
};

/** RENAME pair as `old AS new` or `new = old`; returns undefined for other shapes. */
const getRenamePair = (
  arg: ESQLCommand['args'][number]
): { source: string; target: string } | undefined => {
  if (Array.isArray(arg) || !isFunctionExpression(arg)) return undefined;
  if (arg.name !== 'as' && !isAssignment(arg)) return undefined;
  const [first, second] = arg.args;
  if (Array.isArray(first) || Array.isArray(second) || !isColumn(first) || !isColumn(second)) {
    return undefined;
  }
  return arg.name === 'as'
    ? { source: first.name, target: second.name }
    : { source: second.name, target: first.name };
};

/** Applies a command's effect on the column scope without mutating the command. */
const transferScope = (command: ESQLCommand, scope: ColumnScope): ColumnScope => {
  switch (command.name) {
    case 'stats':
      return new Set(getStatsOutputColumns(command));
    case 'keep': {
      const kept = command.args.filter(isColumn).map((column) => column.name);
      // wildcard patterns cannot be enumerated → open scope
      return kept.some((name) => name.includes('*')) ? null : new Set(kept);
    }
    case 'drop': {
      if (scope === null) return null;
      const next = new Set(scope);
      for (const arg of command.args) {
        if (isColumn(arg)) next.delete(arg.name);
      }
      return next;
    }
    case 'rename': {
      if (scope === null) return null;
      const next = new Set(scope);
      for (const arg of command.args) {
        const pair = getRenamePair(arg);
        if (!pair) continue;
        next.delete(pair.source);
        next.add(pair.target);
      }
      return next;
    }
    case 'eval': {
      if (scope === null) return null;
      const next = new Set(scope);
      for (const arg of command.args) {
        const resultColumn = getExpressionResultColumn(arg);
        if (resultColumn !== undefined) next.add(resultColumn);
      }
      return next;
    }
    // commands that neither add nor remove columns
    case 'where':
    case 'sort':
    case 'limit':
    case 'mv_expand':
      return scope;
    default:
      // unknown commands may introduce columns (DISSECT, GROK, ENRICH, ...);
      // fall back to an open scope so later references are not falsely pruned
      return null;
  }
};

/** Computes the column scope after the given commands, starting open. */
const computeScope = (commands: ESQLCommand[]): ColumnScope =>
  commands.reduce<ColumnScope>((scope, command) => transferScope(command, scope), null);

/**
 * Removes references to columns that are no longer available after an inlined
 * FORK branch: the synthetic `_fork` discriminator and any column produced
 * only by a discarded branch. Walks forward, updating the scope per command:
 *
 * - WHERE out-of-scope sub-predicates under AND are pruned; predicates where
 *   the reference cannot be isolated (e.g. under OR) drop the whole WHERE
 * - KEEP / DROP / SORT entries referencing out-of-scope columns are removed;
 *   commands left with no arguments are dropped
 * - RENAME pairs with an out-of-scope source are removed; empty RENAMEs drop
 * - EVAL assignments referencing out-of-scope columns are removed, so their
 *   result columns never enter the scope (cascading to later references)
 * - unknown commands are left untouched and open the scope (no pruning after)
 */
const removeOutOfScopeReferences = (
  commands: ESQLCommand[],
  fromIndex: number,
  initialScope: ColumnScope
): void => {
  // Caveat: a `WHERE _fork == "forkN"` conjunct is dropped even when it pinned
  // a different branch than the metric-driven selection; the metric column's
  // lineage wins over the user's discriminator filter for trendline purposes.
  let scope = initialScope;
  for (let i = fromIndex; i < commands.length; i++) {
    const command = commands[i];
    let removeCommand = false;

    switch (command.name) {
      case 'where': {
        const [predicate] = command.args;
        const pruned = Array.isArray(predicate)
          ? undefined
          : prunePredicate(predicate as ESQLSingleAstItem, scope);
        if (pruned) {
          command.args = [pruned];
        } else {
          removeCommand = true;
        }
        break;
      }
      case 'keep':
      case 'drop':
      case 'sort': {
        const currentScope = scope;
        // SORT entries with a direction or nulls modifier (e.g. `_fork DESC`)
        // are order nodes wrapping the column, not bare columns
        command.args = command.args.filter((arg) => {
          const node = !Array.isArray(arg) && arg.type === 'order' ? arg.args[0] : arg;
          if (Array.isArray(node)) return true;
          // wildcard KEEP/DROP patterns are kept as-is
          if (isColumn(node) && node.name.includes('*')) return true;
          return refsAreInScope(node, currentScope);
        });
        if (command.args.length === 0) removeCommand = true;
        break;
      }
      case 'rename': {
        const currentScope = scope;
        command.args = command.args.filter((arg) => {
          const pair = getRenamePair(arg);
          if (!pair) return true;
          return (
            pair.source !== FORK_DISCRIMINATOR_COLUMN &&
            pair.target !== FORK_DISCRIMINATOR_COLUMN &&
            (currentScope === null || currentScope.has(pair.source))
          );
        });
        if (command.args.length === 0) removeCommand = true;
        break;
      }
      case 'eval': {
        // ES|QL resolves EVAL assignments left to right and allows referencing
        // an earlier assignment within the same EVAL, so the scope accumulates
        // across kept assignments instead of being captured once per command
        const workingScope: ColumnScope = scope === null ? null : new Set(scope);
        // for assignments (`x = expr`) only the right-hand side must be in
        // scope; the assignment target is the column being introduced
        command.args = command.args.filter((arg) => {
          if (Array.isArray(arg)) return true;
          const nodesToCheck =
            isAssignment(arg) && isColumn(arg.args[0]) ? arg.args.slice(1) : [arg];
          const inScope = nodesToCheck
            .flat()
            .every((node) => Array.isArray(node) || refsAreInScope(node, workingScope));
          if (inScope && workingScope !== null) {
            const resultColumn = getExpressionResultColumn(arg);
            if (resultColumn !== undefined) workingScope.add(resultColumn);
          }
          return inScope;
        });
        if (command.args.length === 0) removeCommand = true;
        break;
      }
      default:
        // conservative: leave other command shapes untouched
        break;
    }

    if (removeCommand) {
      commands.splice(i, 1);
      i--;
      continue;
    }
    scope = transferScope(command, scope);
  }
};

/**
 * Replaces FORK commands with the commands of a single selected branch so the
 * trendline rewrite operates on source columns that are in scope. After FORK,
 * only branch output columns (plus the synthetic `_fork` discriminator) are
 * available, so time bucketing cannot be appended to the whole query; instead
 * the branch whose output scope contains the metric column is inlined.
 *
 * Mutates `commands` in place. Runs until no FORK remains, so branches that
 * themselves contain FORK (and any residual FORKs) are also flattened.
 */
export const flattenForkCommands = (commands: ESQLCommand[], metricFields?: string[]): void => {
  // single forward pass: flattening never introduces a FORK before the splice
  // point, so earlier commands need no rescan
  for (let i = 0; i < commands.length; i++) {
    if (commands[i].name !== 'fork') continue;
    const branch = selectForkBranch(getForkBranches(commands[i]), metricFields) ?? [];
    commands.splice(i, 1, ...branch);
    const afterBranchIndex = i + branch.length;
    removeOutOfScopeReferences(
      commands,
      afterBranchIndex,
      computeScope(commands.slice(0, afterBranchIndex))
    );
    i--; // re-check current index: inlined branch may itself start with FORK
  }
};
