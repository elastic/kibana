/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * The tokens that matter when splitting: each string literal is consumed whole, so nothing
 * inside one can be read as a pipe. The alternatives, tried leftmost first:
 * - `"""…"""` - a triple-quoted literal (no escapes), to its closing quotes or, unterminated,
 *   the end of the query;
 * - `"…"` - a plain literal, `\"` and the other `\x` escapes skipped, to its closing quote
 *   or the end;
 * - `|` - a pipe between commands, the only token that splits.
 */
const LITERAL_OR_PIPE = /"""[\s\S]*?(?:"""|$)|"(?:\\.|[^"\\])*(?:"|$)|\|/g;

/**
 * The top-level commands of an ES|QL query: split on pipes outside string literals, so a
 * `|` inside a `"..."` or `"""..."""` literal (a span name, say) never cuts a command.
 */
function splitCommands(query: string): string[] {
  const pipes = [...query.matchAll(LITERAL_OR_PIPE)]
    .filter((token) => token[0] === '|')
    .map((token) => token.index);
  // A command runs from the start of the query, or from past a pipe, to the next pipe or the end.
  return [0, ...pipes.map((pipe) => pipe + 1)].map((start, i) =>
    query.slice(start, pipes[i] ?? query.length)
  );
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
