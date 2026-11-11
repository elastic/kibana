/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Parser, WrappingPrettyPrinter, mutate, synth } from '@elastic/esql';
import { escapeEsqlColumnName } from '@kbn/esql-language';

const CATEGORIZE_COUNT_COLUMN = 'Count';
const CATEGORIZE_PATTERN_COLUMN = 'Pattern';

// Trailing commands that only shape the displayed rows. They are dropped so that
// CATEGORIZE runs over every matching document instead of e.g. the first LIMIT rows.
const DROPPABLE_TRAILING_COMMANDS: ReadonlySet<string> = new Set(['limit', 'sort', 'keep', 'drop']);

/**
 * Appends a `STATS ... BY CATEGORIZE(field)` pipeline to the query, removing trailing LIMIT/SORT/KEEP/DROP commands first.
 */
export const appendCategorizeToESQLQuery = (esql: string, field: string): string => {
  // Parsing with formatting keeps comments on the AST, so the printer can write them back
  const { root } = Parser.parse(esql, { withFormatting: true, withParens: true });

  let lastCommand = root.commands[root.commands.length - 1];
  while (root.commands.length > 1 && DROPPABLE_TRAILING_COMMANDS.has(lastCommand.name)) {
    mutate.generic.commands.remove(root, lastCommand);
    lastCommand = root.commands[root.commands.length - 1];
  }

  mutate.generic.commands.append(
    root,
    synth.cmd(
      `STATS ${CATEGORIZE_COUNT_COLUMN} = COUNT(*) BY ${CATEGORIZE_PATTERN_COLUMN} = CATEGORIZE(${escapeEsqlColumnName(
        field
      )})`
    )
  );
  mutate.generic.commands.append(root, synth.cmd(`SORT ${CATEGORIZE_COUNT_COLUMN} DESC`));

  return WrappingPrettyPrinter.print(root, { multiline: true });
};
