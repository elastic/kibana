/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ESQLAstDenseVectorCommand } from '@elastic/esql/types';
import { isMap } from '@elastic/esql';

export enum CaretPosition {
  FIELD_LIST, // After DENSE_VECTOR: suggest the comma-separated field list
  AFTER_WITH_KEYWORD, // After WITH but before the opening brace: suggest the map opener
  WITHIN_MAP_EXPRESSION, // Within WITH { ... }: suggest map parameters
  AFTER_COMMAND, // Command is complete: suggest pipe
}

/**
 * The grammar is `DENSE_VECTOR <field list> [WITH { ... }]`, so the only branch that needs
 * inspecting is the `WITH` map — anything before it belongs to the field list, which
 * `suggestFieldsList` resolves on its own.
 */
export function getPosition(
  command: ESQLAstDenseVectorCommand,
  cursorPosition: number
): CaretPosition {
  const { namedParameters } = command;

  if (namedParameters !== undefined) {
    const map = isMap(namedParameters) ? namedParameters : undefined;

    // `WITH` typed without a brace yet parses to an empty, incomplete map.
    if (!map || (map.incomplete && !map.text)) {
      return CaretPosition.AFTER_WITH_KEYWORD;
    }

    const isWithinMap = map.incomplete
      ? !(map.text.trimEnd().endsWith('}') && cursorPosition > map.location.max)
      : cursorPosition <= map.location.max;

    return isWithinMap ? CaretPosition.WITHIN_MAP_EXPRESSION : CaretPosition.AFTER_COMMAND;
  }

  return CaretPosition.FIELD_LIST;
}
