/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { BasicPrettyPrinter, Parser, mutate } from '@kbn/esql-language';

export const appendStatsByToQuery = (queryString: string, column: string) => {
  const { root } = Parser.parse(queryString);
  const lastCommand = root.commands[root.commands.length - 1];
  if (lastCommand.name === 'stats') {
    const statsCommand = lastCommand;
    mutate.generic.commands.remove(root, statsCommand);
    const queryWithoutStats = BasicPrettyPrinter.print(root);
    return `${queryWithoutStats}\n| STATS BY ${column}`;
  } else {
    return `${queryString}\n| STATS BY ${column}`;
  }
};
