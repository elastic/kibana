/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Builder, esql, isFunctionExpression, isColumn, isOptionNode, Parser } from '@elastic/esql';
import type { ESQLCommand } from '@elastic/esql/types';
import { escapeRegExp } from 'lodash';

/**
 * Minimal single-column dataflow walker over an ES|QL command pipeline.
 *
 * Mirrors the per-command transfer-function structure of the `columnsAfter`
 * registry in `@kbn/esql-language` (which is async and requires ES field
 * callbacks, so it cannot be used synchronously here). Commands without a
 * registered transfer function are treated as schema-preserving.
 */

interface AvailableTrackedColumnState {
  name: string;
  /** Equivalent names in preference order, with the latest alias last. */
  aliases: readonly string[];
}

/** Scope state of a tracked column, including loss of all equivalent names. */
export type TrackedColumnState =
  | AvailableTrackedColumnState
  | { name: undefined; aliases: readonly [] };

const columnState = (aliases: readonly string[]): TrackedColumnState => {
  const name = aliases.at(-1);
  return name === undefined ? { name: undefined, aliases: [] } : { name, aliases };
};

const matchesColumn = (arg: ESQLCommand['args'][number], name: string): boolean => {
  if (!isColumn(arg)) return false;
  if (arg.quoted || !arg.name.includes('*')) return arg.name === name;
  const pattern = arg.name.split('*').map(escapeRegExp).join('.*');
  return new RegExp(`^${pattern}$`).test(name);
};

interface TransferContext {
  /** When true, KEEP commands missing the column are extended to retain it. */
  ensureKept: boolean;
  /** When true, STATS commands are grouped by the tracked column. */
  ensureGrouped: boolean;
}

type CommandTransfer = (
  command: ESQLCommand,
  state: TrackedColumnState,
  context: TransferContext
) => TrackedColumnState;

/**
 * RENAME remaps the tracked column. Handles both `RENAME old AS new` and
 * `RENAME new = old` forms.
 */
const renameTransfer: CommandTransfer = (command, state) => {
  let aliases: readonly string[] = state.aliases;
  for (const arg of command.args) {
    if (Array.isArray(arg) || !isFunctionExpression(arg)) continue;
    const [left, right] = arg.args;
    if (Array.isArray(left) || Array.isArray(right) || !isColumn(left) || !isColumn(right)) {
      continue;
    }
    if (arg.name !== 'as' && arg.name !== '=') continue;
    const source = arg.name === 'as' ? left.name : right.name;
    const target = arg.name === 'as' ? right.name : left.name;
    // A rename moves identity; it must not make an older alias preferred.
    aliases = aliases
      .filter((name) => name !== target || name === source)
      .map((name) => (name === source ? target : name));
  }
  return columnState(aliases);
};

/** EVAL copies direct column identities and invalidates overwritten names. */
const evalTransfer: CommandTransfer = (command, state) => {
  let aliases: readonly string[] = state.aliases;
  for (const arg of command.args) {
    if (Array.isArray(arg) || !isFunctionExpression(arg) || arg.name !== '=') continue;
    const [left, rightArg] = arg.args;
    const right = Array.isArray(rightArg) && rightArg.length === 1 ? rightArg[0] : rightArg;
    if (Array.isArray(left) || !isColumn(left)) continue;
    const copiesIdentity = !Array.isArray(right) && isColumn(right) && aliases.includes(right.name);
    if (copiesIdentity && isColumn(right) && left.name === right.name) continue;
    aliases = aliases.filter((name) => name !== left.name);
    if (copiesIdentity) aliases = [...aliases, left.name];
  }
  return columnState(aliases);
};

/**
 * KEEP projects the schema. With `ensureKept`, the tracked column is appended
 * to the projection when missing so it survives the command.
 */
const keepTransfer: CommandTransfer = (command, state, { ensureKept }) => {
  const aliases = state.aliases.filter((name) =>
    command.args.some((arg) => matchesColumn(arg, name))
  );
  if (aliases.length > 0) return columnState(aliases);
  if (!ensureKept || state.name === undefined) return columnState([]);
  command.args.push(Builder.expression.column(state.name));
  return columnState([state.name]);
};

/** Removes the tracked column from DROP so it remains available downstream. */
const dropTransfer: CommandTransfer = (command, state, { ensureKept }) => {
  const aliases = state.aliases.filter(
    (name) => !command.args.some((arg) => matchesColumn(arg, name))
  );
  if (aliases.length > 0) return columnState(aliases);
  if (!ensureKept || state.name === undefined) return columnState([]);

  const preferredName = state.name;
  command.args = command.args.filter((arg) => !matchesColumn(arg, preferredName));
  return columnState([state.name]);
};

/**
 * Carries the tracked column across an aggregation boundary by adding it to
 * STATS BY. This keeps a time bucket produced upstream available downstream.
 */
const statsTransfer: CommandTransfer = (command, state, { ensureGrouped }) => {
  const byOption = command.args.find(isOptionNode);
  const aliases: string[] = [];
  for (const name of state.aliases) {
    for (const arg of byOption?.args ?? []) {
      if (isColumn(arg) && arg.name === name) aliases.push(name);
      if (!isFunctionExpression(arg) || arg.name !== '=') continue;
      const [left, rightArg] = arg.args;
      const right = Array.isArray(rightArg) && rightArg.length === 1 ? rightArg[0] : rightArg;
      if (
        !Array.isArray(left) &&
        isColumn(left) &&
        !Array.isArray(right) &&
        isColumn(right) &&
        right.name === name
      ) {
        aliases.push(left.name);
      }
    }
  }
  if (aliases.length > 0) return columnState(aliases);
  if (!ensureGrouped || state.name === undefined) return columnState([]);

  if (byOption) {
    byOption.args.push(Builder.expression.column(state.name));
    return columnState([state.name]);
  }

  // Parse a helper query to obtain a correctly typed BY option AST node.
  const { root } = Parser.parse(`FROM _x | STATS _x BY ${esql.col(state.name)}`);
  const helperStats = root.commands.find((candidate) => candidate.name === 'stats');
  const helperByOption = helperStats?.args.find(isOptionNode);
  if (!helperByOption) throw new Error('Expected BY option in helper STATS command');
  command.args.push(helperByOption);
  return columnState([state.name]);
};

const identityTransfer: CommandTransfer = (_command, state) => state;

const transferFns: Record<string, CommandTransfer> = {
  rename: renameTransfer,
  eval: evalTransfer,
  keep: keepTransfer,
  drop: dropTransfer,
  stats: statsTransfer,
};

/**
 * Folds the tracked column's scope state through the pipeline, applying each
 * command's transfer function in order. With `ensureKept`, KEEP commands are
 * mutated so the column survives the whole segment.
 */
const walkColumn = (
  commands: ESQLCommand[],
  columnName: string,
  { ensureKept, ensureGrouped }: TransferContext
): TrackedColumnState => {
  let state: TrackedColumnState = columnState([columnName]);
  for (let index = 0; index < commands.length; index++) {
    const command = commands[index];
    state = (transferFns[command.name] ?? identityTransfer)(command, state, {
      ensureKept,
      ensureGrouped,
    });
  }
  return state;
};

/**
 * Resolves the final name of a column after walking pipeline commands.
 * Read-only: never mutates the AST.
 */
export const resolveTrackedColumn = (
  commands: ESQLCommand[],
  columnName: string
): TrackedColumnState =>
  walkColumn(commands, columnName, { ensureKept: false, ensureGrouped: false });

/**
 * Resolves the final name of a column and mutates KEEP commands along the way
 * so the column survives the whole pipeline segment.
 */
export const trackColumnAndEnsureKept = (
  commands: ESQLCommand[],
  columnName: string,
  {
    ensureGrouped = false,
    containingCommands = commands,
  }: { ensureGrouped?: boolean; containingCommands?: ESQLCommand[] } = {}
): AvailableTrackedColumnState => {
  const state = walkColumn(commands, columnName, { ensureKept: true, ensureGrouped });
  if (state.name === undefined) {
    throw new Error(`Cannot build trendline: time column [${columnName}] is no longer available`);
  }
  // Removing the only DROP argument leaves invalid ES|QL. Use object identity
  // to remove that command from its containing pipeline when walking a slice.
  const emptiedDrops = new Set(
    commands.filter((command) => command.name === 'drop' && command.args.length === 0)
  );
  for (let index = containingCommands.length - 1; index >= 0; index--) {
    if (emptiedDrops.has(containingCommands[index])) containingCommands.splice(index, 1);
  }
  return state;
};
