/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * The top-level commands of an ES|QL query: split on pipes outside string literals, so a
 * `|` inside a `"..."` or `"""..."""` literal (a span name, say) never cuts a command.
 */
function splitCommands(query: string): string[] {
  const commands: string[] = [];
  let start = 0;
  let i = 0;
  while (i < query.length) {
    if (query.startsWith('"""', i)) {
      const end = query.indexOf('"""', i + 3);
      i = end === -1 ? query.length : end + 3;
      continue;
    }
    const char = query[i];
    if (char === '"') {
      i += 1;
      while (i < query.length && query[i] !== '"') i += query[i] === '\\' ? 2 : 1;
      i += 1;
      continue;
    }
    if (char === '|') {
      commands.push(query.slice(start, i));
      start = i + 1;
    }
    i += 1;
  }
  commands.push(query.slice(start));
  return commands;
}

/**
 * The expressions of the query's WHERE commands. String literals are respected: a pipe or
 * the word "where" inside a value stays part of its expression, so conditions carrying
 * arbitrary names (the latency map's operation clause, a user's own filters) round-trip.
 */
export function extractFilters(query: string) {
  return splitCommands(query)
    .map((command) => command.trim())
    .filter((command) => /^where\s/i.test(command))
    .map((command) => command.slice('where'.length).trim())
    .filter((item) => item !== '');
}
