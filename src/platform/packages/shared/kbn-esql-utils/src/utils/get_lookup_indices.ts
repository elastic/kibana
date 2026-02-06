/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLSource } from '@kbn/esql-language';
import { Parser, isSource } from '@kbn/esql-language';

/**
 * Extracts and returns a list of unique lookup indices from the provided ESQL query by parsing the query and traversing its AST.
 *
 * @param {string} esqlQuery - The ESQL query string to parse and analyze for lookup indices.
 * @return {string[]} An array of unique lookup index names found in the query.
 */
export function getLookupIndicesFromQuery(esqlQuery: string): string[] {
  const indexNames: string[] = [];

  // parse esql query and find lookup indices in the query, traversing the AST
  const { root } = Parser.parse(esqlQuery);
  // find all join commands
  root.commands.forEach((command) => {
    if (command.name === 'join') {
      const indexName = command.args.find<ESQLSource>(isSource);
      if (indexName?.name) {
        indexNames.push(indexName.name);
      }
    }
  });

  return Array.from(new Set(indexNames));
}
