/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  BasicPrettyPrinter,
  Builder,
  Parser,
  Walker,
  walk,
  type ESQLLiteral,
  type WalkerProperNode,
} from '@elastic/esql';

/** An AI proposal the user kept or undid. */
export interface AiProposal {
  /** The user's prompt, or the error message that triggered a Fix with AI. */
  prompt: string;
  /** The full query the proposal belongs to. */
  query: string;
  /** 1-based inclusive range of the generated lines within `query`. */
  generatedLineStart: number;
  generatedLineEnd: number;
}

const isRedactedLiteral = ({ literalType }: ESQLLiteral) =>
  literalType === 'keyword' || literalType === 'integer' || literalType === 'double';

/**
 * Returns the ES|QL commands on the generated lines with string and numeric literals replaced by
 * `?` and comments dropped; source names and LIMIT values are kept. Undefined when the query does
 * not parse.
 */
export const redactGeneratedQuery = ({
  query,
  generatedLineStart,
  generatedLineEnd,
}: Omit<AiProposal, 'prompt'>): string | undefined => {
  const { root, errors } = Parser.parse(query);
  if (errors.length) return undefined;

  const literals = new Set<WalkerProperNode>();
  walk(root, {
    visitLiteral: (node, parent) => {
      if (parent?.type === 'source' || parent?.name === 'limit') return;
      if (isRedactedLiteral(node)) literals.add(node);
    },
  });
  Walker.replaceAll(
    root,
    (node) => literals.has(node),
    () => Builder.param.unnamed()
  );

  // Character offset at which each line starts, plus one past the end of the query.
  const lineOffsets = query
    .split('\n')
    .reduce<number[]>(
      (offsets, line) => [...offsets, offsets[offsets.length - 1] + line.length + 1],
      [0]
    );
  const min = lineOffsets[generatedLineStart - 1];
  const max = lineOffsets[generatedLineEnd] - 1;
  const commands = root.commands.filter(
    ({ location }) => location.min <= max && location.max >= min
  );

  return commands.length
    ? commands.map((command) => BasicPrettyPrinter.command(command)).join(' | ')
    : undefined;
};
