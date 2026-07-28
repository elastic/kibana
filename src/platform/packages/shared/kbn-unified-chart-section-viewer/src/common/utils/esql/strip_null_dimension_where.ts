/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BasicPrettyPrinter, isColumn, isFunctionExpression, mutate, Parser } from '@elastic/esql';

/**
 * Removes standalone `WHERE <selected dimension> IS NULL` commands from the source query used
 * for metric capability discovery.
 *
 * The null predicate remains part of the parent Discover query and generated chart queries. Only
 * exact standalone commands are removed; compound expressions are preserved because removing one
 * branch would change their Boolean semantics. The original query is returned when it is empty,
 * malformed, or contains no matching command.
 */
export function stripNullDimensionWhere(
  query?: string,
  selectedDimensionNames?: string[]
): string | undefined {
  if (!query || !selectedDimensionNames?.length) {
    return query;
  }

  const { root, errors } = Parser.parse(query);
  if (errors.length > 0) {
    return query;
  }

  const selectedDimensions = new Set(selectedDimensionNames);
  const nullDimensionFilters = root.commands.filter((command) => {
    if (command.name !== 'where') {
      return false;
    }

    const expression = command.args[0];
    return (
      isFunctionExpression(expression) &&
      expression.name === 'is null' &&
      isColumn(expression.args[0]) &&
      selectedDimensions.has(expression.args[0].name)
    );
  });

  if (nullDimensionFilters.length === 0) {
    return query;
  }

  nullDimensionFilters.forEach((command) => mutate.generic.commands.remove(root, command));
  return BasicPrettyPrinter.print(root);
}
