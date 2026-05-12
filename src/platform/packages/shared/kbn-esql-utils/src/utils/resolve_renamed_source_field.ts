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
import { getQuerySummary, getSummaryPerCommand } from './get_query_summary';

const COMMANDS_THAT_ALLOW_RENAMING = new Set(['rename', 'stats', 'inline stats']);

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
  commands: ESQLAstCommand[],
  fieldName: string,
  query: string
): number {
  let lastIndex = -1;
  for (let i = 0; i < commands.length; i++) {
    const cmd = commands[i];
    if (!COMMANDS_THAT_ALLOW_RENAMING.has(cmd.name)) {
      continue;
    }
    const { renamedColumnsPairs } = getSummaryPerCommand(query, cmd);
    if (!renamedColumnsPairs?.size) {
      continue;
    }
    if ([...renamedColumnsPairs].some(([newName]) => newName === fieldName)) {
      lastIndex = i;
    }
  }
  return lastIndex;
}

function isFieldNameInvalidatedAfterRenameDefinition(
  commands: ESQLAstCommand[],
  fieldName: string,
  renameDefIndex: number,
  query: string
): boolean {
  for (let i = renameDefIndex + 1; i < commands.length; i++) {
    const cmd = commands[i];
    if (cmd.name === 'drop') {
      if (getDroppedColumnNamesFromArgs(cmd).includes(fieldName)) {
        return true;
      }
    }
    if (cmd.name === 'eval') {
      const { newColumns } = getSummaryPerCommand(query, cmd);
      if (newColumns.has(fieldName)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Maps an ES|QL output column name toward a field name suitable for filters by walking
 * `RENAME` / `STATS` / `INLINE STATS` commands from last to first (the most recent rename
 * wins for each step). Pairs come from `getSummaryPerCommand` so pipeline order is preserved.
 *
 * If unwinding would cross a computed column that is not itself a rename output
 * (for example `EVAL message = …` then `RENAME message AS context`), returns the
 * original output column name instead of colliding with an index field of the same name.
 *
 * If `fieldName` was introduced as a rename output but a later `DROP fieldName` or
 * `EVAL fieldName = …` redefines the column, returns `fieldName` so filters do not follow
 * stale merged rename metadata.
 */
export function resolveRenamedSourceField(fieldName: string, query: string): string {
  const fullSummary = getQuerySummary(query);
  const mergedPairs = fullSummary.renamedColumnsPairs ? [...fullSummary.renamedColumnsPairs] : [];
  const renameOutputNames = new Set(mergedPairs.map(([newName]) => newName));

  if (!renameOutputNames.has(fieldName)) {
    return fieldName;
  }

  const wouldUnwindIntoNonRenameSynthetic = (oldName: string) =>
    fullSummary.newColumns.has(oldName) && !renameOutputNames.has(oldName);

  if (fullSummary.newColumns.has(fieldName) && !renameOutputNames.has(fieldName)) {
    const fieldTouchesRename = mergedPairs.some(([newName, oldName]) =>
      [newName, oldName].includes(fieldName)
    );
    if (!fieldTouchesRename) {
      return fieldName;
    }
  }

  const { root } = Parser.parse(query);
  const renameDefIndex = getLastRenameCommandIndexForNewName(root.commands, fieldName, query);
  if (
    renameDefIndex >= 0 &&
    isFieldNameInvalidatedAfterRenameDefinition(root.commands, fieldName, renameDefIndex, query)
  ) {
    return fieldName;
  }

  let current = fieldName;
  for (const cmd of [...root.commands].reverse()) {
    if (!COMMANDS_THAT_ALLOW_RENAMING.has(cmd.name)) {
      continue;
    }

    const { renamedColumnsPairs } = getSummaryPerCommand(query, cmd);
    if (!renamedColumnsPairs?.size) {
      continue;
    }

    const pair = [...renamedColumnsPairs].find(([newName]) => newName === current);
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
