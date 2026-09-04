/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BasicPrettyPrinter, mutate, Parser } from '@elastic/esql';

/**
 * Removes every WHERE command from an ES|QL query.
 * Returns the original string when there is no WHERE or parsing fails so
 * callers can use reference equality to detect a no-op.
 */
export function dropWhereCommands(query: string): string;
export function dropWhereCommands(query: undefined): undefined;
export function dropWhereCommands(query: string | undefined): string | undefined;
export function dropWhereCommands(query: string | undefined): string | undefined {
  if (!query) {
    return query;
  }

  const { root, errors } = Parser.parse(query);
  if (errors.length > 0) {
    return query;
  }

  const whereCommands = root.commands.filter((command) => command.name === 'where');
  if (whereCommands.length === 0) {
    return query;
  }

  whereCommands.forEach((command) => mutate.generic.commands.remove(root, command));
  return BasicPrettyPrinter.print(root);
}
