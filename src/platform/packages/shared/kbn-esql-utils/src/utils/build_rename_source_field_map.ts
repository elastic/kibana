/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isColumn, Parser } from '@elastic/esql';
import type { ESQLAstCommand, ESQLColumn } from '@elastic/esql/types';
import type { ESQLCommandSummary } from '@kbn/esql-language/src/commands/registry/types';
import { getSummaryPerCommand } from './get_query_summary';

const COMMANDS_THAT_ALLOW_RENAMING = new Set(['rename', 'stats', 'inline stats']);

interface CommandWithSummary {
  cmd: ESQLAstCommand;
  summary: ESQLCommandSummary;
}

function getDroppedColumnNamesFromArgs(command: ESQLAstCommand): string[] {
  const names: string[] = [];
  for (const arg of command.args) {
    if (isColumn(arg)) {
      const col = arg as ESQLColumn;
      names.push(col.parts?.length ? col.parts.join('.') : col.name);
    }
  }
  return names;
}

function getLastRenameCommandIndexForNewName(
  commandSummaries: CommandWithSummary[],
  fieldName: string
): number {
  let lastIndex = -1;
  for (let i = 0; i < commandSummaries.length; i++) {
    const { cmd, summary } = commandSummaries[i];
    if (!COMMANDS_THAT_ALLOW_RENAMING.has(cmd.name) || !summary.renamedColumnsPairs?.size) {
      continue;
    }
    if ([...summary.renamedColumnsPairs].some(([newName]) => newName === fieldName)) {
      lastIndex = i;
    }
  }
  return lastIndex;
}

function isFieldNameInvalidatedAfterRenameDefinition(
  commandSummaries: CommandWithSummary[],
  fieldName: string,
  renameDefIndex: number
): boolean {
  for (let i = renameDefIndex + 1; i < commandSummaries.length; i++) {
    const { cmd, summary } = commandSummaries[i];
    if (cmd.name === 'drop' && getDroppedColumnNamesFromArgs(cmd).includes(fieldName)) {
      return true;
    }
    if (cmd.name === 'eval' && summary.newColumns.has(fieldName)) {
      return true;
    }
  }
  return false;
}

function resolveOneField(
  fieldName: string,
  commandSummaries: CommandWithSummary[],
  renameOutputNames: Set<string>,
  fullNewColumns: Set<string>
): string {
  if (!renameOutputNames.has(fieldName)) {
    return fieldName;
  }

  const wouldUnwindIntoNonRenameSynthetic = (oldName: string) =>
    fullNewColumns.has(oldName) && !renameOutputNames.has(oldName);

  const renameDefIndex = getLastRenameCommandIndexForNewName(commandSummaries, fieldName);
  if (
    renameDefIndex >= 0 &&
    isFieldNameInvalidatedAfterRenameDefinition(commandSummaries, fieldName, renameDefIndex)
  ) {
    return fieldName;
  }

  let current = fieldName;
  for (const { cmd, summary } of [...commandSummaries].reverse()) {
    if (!COMMANDS_THAT_ALLOW_RENAMING.has(cmd.name) || !summary.renamedColumnsPairs?.size) {
      continue;
    }
    const pair = [...summary.renamedColumnsPairs].find(([newName]) => newName === current);
    if (!pair) {
      continue;
    }
    const [, oldName] = pair;
    if (wouldUnwindIntoNonRenameSynthetic(oldName)) {
      return fieldName;
    }
    current = oldName;
  }
  return current;
}

function buildContext(query: string): {
  commandSummaries: CommandWithSummary[];
  renameOutputNames: Set<string>;
  fullNewColumns: Set<string>;
} {
  const { root } = Parser.parse(query);
  const commandSummaries: CommandWithSummary[] = root.commands.map((cmd) => ({
    cmd,
    summary: getSummaryPerCommand(query, cmd),
  }));

  const renameOutputNames = new Set<string>();
  const fullNewColumns = new Set<string>();
  for (const { summary } of commandSummaries) {
    summary.renamedColumnsPairs?.forEach(([newName]) => renameOutputNames.add(newName));
    summary.newColumns?.forEach((col) => fullNewColumns.add(col));
  }

  return { commandSummaries, renameOutputNames, fullNewColumns };
}

/**
 * Pre-computes the rename source field resolution for every rename target in a single parse pass.
 * Use this when resolving multiple columns for the same query (e.g. a full column list from an
 * ES response). Only columns that actually resolve to a different source field are present in the
 * returned map; callers should fall back to the column name for absent entries.
 */
export function buildRenameSourceFieldMap(query: string): Map<string, string> {
  const { commandSummaries, renameOutputNames, fullNewColumns } = buildContext(query);
  const map = new Map<string, string>();
  for (const name of renameOutputNames) {
    const resolved = resolveOneField(name, commandSummaries, renameOutputNames, fullNewColumns);
    if (resolved !== name) {
      map.set(name, resolved);
    }
  }
  return map;
}
