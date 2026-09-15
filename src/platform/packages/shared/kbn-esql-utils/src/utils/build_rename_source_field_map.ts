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

interface CommandWithSummary {
  cmd: ESQLAstCommand;
  summary: ESQLCommandSummary;
}

interface RenameResolutionContext {
  commandSummaries: CommandWithSummary[];
  /** Names produced by rename/stats/inline-stats renamings only — excludes eval-computed columns. */
  renameOutputNames: Set<string>;
  /** All synthetic column names: rename targets + eval/stats outputs. Used to detect non-rename-origin columns. */
  fullNewColumns: Set<string>;
  lastRenameDefIndexByNewName: Map<string, number>;
  renameNewToOldByCommandIndex: Array<Map<string, string> | undefined>;
  droppedColumnNamesByIndex: Array<Set<string> | undefined>;
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

function isFieldNameInvalidatedAfterRenameDefinition(
  commandSummaries: CommandWithSummary[],
  droppedColumnNamesByIndex: Array<Set<string> | undefined>,
  fieldName: string,
  renameDefIndex: number
): boolean {
  for (let i = renameDefIndex + 1; i < commandSummaries.length; i++) {
    const { cmd, summary } = commandSummaries[i];
    if (cmd.name === 'drop') {
      const dropped = droppedColumnNamesByIndex[i];
      if (dropped?.has(fieldName)) {
        return true;
      }
    }
    if (cmd.name === 'eval' && summary.newColumns.has(fieldName)) {
      return true;
    }
  }
  return false;
}

function resolveOneField(
  fieldName: string,
  {
    commandSummaries,
    renameOutputNames,
    fullNewColumns,
    lastRenameDefIndexByNewName,
    renameNewToOldByCommandIndex,
    droppedColumnNamesByIndex,
  }: RenameResolutionContext
): string {
  const isComputedColumn = (oldName: string) =>
    fullNewColumns.has(oldName) && !renameOutputNames.has(oldName);

  const renameDefIndex = lastRenameDefIndexByNewName.get(fieldName) ?? -1;
  if (
    renameDefIndex >= 0 &&
    isFieldNameInvalidatedAfterRenameDefinition(
      commandSummaries,
      droppedColumnNamesByIndex,
      fieldName,
      renameDefIndex
    )
  ) {
    return fieldName;
  }

  let current = fieldName;
  // Walk backwards so the most recent rename wins when a column is renamed more than once.
  for (let i = commandSummaries.length - 1; i >= 0; i--) {
    const pairMap = renameNewToOldByCommandIndex[i];
    if (!pairMap?.size) {
      continue;
    }
    const oldName = pairMap.get(current);
    if (oldName === undefined) {
      continue;
    }
    if (isComputedColumn(oldName)) {
      return fieldName;
    }
    current = oldName;
  }
  return current;
}

function buildContext(query: string): RenameResolutionContext {
  const { root } = Parser.parse(query);
  const commandSummaries: CommandWithSummary[] = root.commands.map((cmd) => ({
    cmd,
    summary: getSummaryPerCommand(query, cmd),
  }));

  const renameOutputNames = new Set<string>();
  const fullNewColumns = new Set<string>();
  const lastRenameDefIndexByNewName = new Map<string, number>();
  const renameNewToOldByCommandIndex: Array<Map<string, string> | undefined> = new Array(
    commandSummaries.length
  );
  const droppedColumnNamesByIndex: Array<Set<string> | undefined> = new Array(
    commandSummaries.length
  );

  for (let i = 0; i < commandSummaries.length; i++) {
    const { cmd, summary } = commandSummaries[i];
    summary.renamedColumnsPairs?.forEach(([newName]) => renameOutputNames.add(newName));
    summary.newColumns?.forEach((col) => fullNewColumns.add(col));

    if (cmd.name === 'drop') {
      droppedColumnNamesByIndex[i] = new Set(getDroppedColumnNamesFromArgs(cmd));
    }

    if (summary.renamedColumnsPairs?.size) {
      const pairMap = new Map<string, string>();
      for (const [newName, oldName] of summary.renamedColumnsPairs) {
        if (!pairMap.has(newName)) {
          pairMap.set(newName, oldName);
        }
        lastRenameDefIndexByNewName.set(newName, i);
      }
      renameNewToOldByCommandIndex[i] = pairMap;
    }
  }

  return {
    commandSummaries,
    renameOutputNames,
    fullNewColumns,
    lastRenameDefIndexByNewName,
    renameNewToOldByCommandIndex,
    droppedColumnNamesByIndex,
  };
}

/**
 * Pre-computes the rename source field resolution for every rename target in a single parse pass.
 * Use this when resolving multiple columns for the same query (e.g. a full column list from an
 * ES response). Only columns that actually resolve to a different source field are present in the
 * returned map; callers should fall back to the column name for absent entries.
 */
export function buildRenameSourceFieldMap(query: string): Map<string, string> {
  const context = buildContext(query);
  const map = new Map<string, string>();
  for (const name of context.renameOutputNames) {
    const resolved = resolveOneField(name, context);
    if (resolved !== name) {
      map.set(name, resolved);
    }
  }
  return map;
}
