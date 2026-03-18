/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLAstQueryExpression, ESQLAstItem, ESQLFunction } from '@elastic/esql/types';
import {
  BasicPrettyPrinter,
  Builder,
  Parser,
  mutate,
  isColumn,
  isFunctionExpression,
} from '@elastic/esql';

/**
 * Injects the specified metadata fields into an ES|QL query's FROM command
 * and performs best-effort fixups so they survive through the pipeline.
 *
 * 1. Upserts each field into `FROM ... METADATA ...` (idempotent).
 * 2. Appends each field to any KEEP command that would otherwise exclude it.
 *
 * KEEP injection stops conservatively at the first command where the field
 * may no longer hold its original metadata value:
 * - `DROP <field>` / wildcard DROP
 * - `RENAME <field> AS …`
 * - `EVAL <field> = …`
 *
 * Falls back to the original query string on parse errors.
 */
export function injectMetadataFields(esqlQuery: string, fields: string[]): string {
  const { root } = Parser.parse(esqlQuery);
  for (const field of fields) {
    mutate.commands.from.metadata.upsert(root, field);
    addFieldToKeepCommands(root, field);
  }
  return BasicPrettyPrinter.print(root);
}

/**
 * Walks the pipeline and appends `fieldName` to KEEP commands that don't
 * already include it. Stops at the first command where the field may no
 * longer hold its original metadata value (DROP, RENAME, or EVAL of it).
 */
function addFieldToKeepCommands(root: ESQLAstQueryExpression, fieldName: string): void {
  if (!root.commands.some((cmd) => cmd.name === 'keep')) {
    return;
  }

  for (const cmd of root.commands) {
    if (cmd.name === 'drop' && hasColumnMatching(cmd.args, fieldName)) {
      break;
    }
    if (cmd.name === 'rename' && hasRenameOf(cmd.args, fieldName)) {
      break;
    }
    if (cmd.name === 'eval' && hasAssignmentTo(cmd.args, fieldName)) {
      break;
    }
    if (cmd.name === 'keep') {
      if (!cmd.args.some((arg) => isColumn(arg) && arg.name === fieldName)) {
        cmd.args.push(Builder.expression.column(fieldName));
      }
    }
  }
}

function isTargetingColumn(arg: ESQLAstItem, columnName: string): arg is ESQLFunction {
  return isFunctionExpression(arg) && isColumn(arg.args[0]) && arg.args[0].name === columnName;
}

function hasRenameOf(args: ESQLAstItem[], fieldName: string): boolean {
  return args.some(
    (arg) => isTargetingColumn(arg, fieldName) && (arg.name === 'as' || arg.name === '=')
  );
}

function hasAssignmentTo(args: ESQLAstItem[], fieldName: string): boolean {
  return args.some((arg) => isTargetingColumn(arg, fieldName) && arg.name === '=');
}

function hasColumnMatching(args: readonly ESQLAstItem[], fieldName: string): boolean {
  return args.some((arg) => isColumn(arg) && (arg.name === fieldName || arg.name.includes('*')));
}
