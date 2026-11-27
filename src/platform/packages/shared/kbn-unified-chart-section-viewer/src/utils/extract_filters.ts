/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseEsqlQuery, topLevelCommands, whereExpression } from './esql_commands';

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
 * The WHERE expressions of a query that does not parse (half-typed, say), read as text:
 * what is there is still worth showing, so the charts can follow a query being edited.
 */
function extractFiltersFromText(query: string): string[] {
  return splitCommands(query)
    .map((command) => command.trim())
    .filter((command) => /^where\s/i.test(command))
    .map((command) => command.slice('where'.length).trim())
    .filter((item) => item !== '');
}

/**
 * The expressions of the query's top-level WHERE commands, as the ES|QL parser reads them:
 * a comment after a condition is not part of it, and a pipe or the word "where" inside a
 * string literal (a span name, say) stays part of its expression. The parser prints each
 * expression in its own shape (`and` as `AND`), with the parentheses of the source kept, so
 * a condition the latency map wrote comes back as it was written. A query that does not
 * parse falls back to its text.
 */
export function extractFilters(query: string): string[] {
  const root = parseEsqlQuery(query);
  if (!root) return extractFiltersFromText(query);
  return topLevelCommands(root, 'where')
    .map(whereExpression)
    .filter((expression): expression is string => Boolean(expression));
}
